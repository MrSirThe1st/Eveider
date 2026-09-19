import type { ParcelStatus } from '@eveider/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import type { Queryable } from '../db/pool.js';
import {
  businessRow,
  compartmentRow,
  createSqlMatchMock,
  lockerRow,
  parcelEventRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { ParcelRepository } from './parcel.repository.js';

vi.mock('./collection-credential.repository.js', () => ({
  CollectionCredentialRepository: class {
    reconcileForParcel = vi.fn(async () => null);
    consumeForParcel = vi.fn(async () => undefined);
    revokeForParcel = vi.fn(async () => undefined);
  },
}));

const txDb: { current: Queryable | null } = { current: null };
const txLog = { begun: false, committed: false, rolledBack: false };

vi.mock('../db/pool.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/pool.js')>();
  return {
    ...actual,
    withTransaction: vi.fn(async <T>(fn: (client: Queryable) => Promise<T>) => {
      if (!txDb.current) throw new Error('Test db not set for withTransaction');
      txLog.begun = true;
      txLog.committed = false;
      txLog.rolledBack = false;
      try {
        const result = await fn(txDb.current);
        txLog.committed = true;
        return result;
      } catch (error) {
        txLog.rolledBack = true;
        throw error;
      }
    }),
  };
});

const shipmentInput = {
  businessId: 'biz-1',
  reference: 'PK-001',
  pickupType: 'merchant_dropoff' as const,
  senderName: 'Pharmacy',
  senderPhone: '+243111111111',
  recipientName: 'Client',
  recipientPhone: '+243000000000',
  lockerId: 'locker-1',
  compartmentId: 'comp-1',
  packageSize: 'medium' as const,
  packageCategory: 'other' as const,
  paymentResponsibility: 'receiver_pays' as const,
};

function deliveryPricingRow() {
  return {
    id: 'rule-1',
    distance_threshold_km: 10,
    below_threshold_amount: 1500,
    above_threshold_amount: 3000,
    currency: 'CDF',
    small_coefficient: 1,
    medium_coefficient: 1.5,
    large_coefficient: 2,
    drop_off_fee_amount: 500,
    locker_rental_rate_amount: 200,
    locker_collection_amount: 700,
    return_locker_amount: 400,
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_by: null,
  };
}

function recipientChargeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'charge-1',
    parcel_id: 'parcel-1',
    business_id: 'biz-1',
    kind: 'locker_collection',
    status: 'owed',
    payer: 'recipient',
    pricing_zone_id: null,
    amount: 0,
    currency: 'CDF',
    unit_rate: null,
    quantity: null,
    period_started_at: null,
    period_ended_at: null,
    locked_at: new Date('2026-01-15T12:00:00.000Z'),
    created_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
    ...overrides,
  };
}

function collectionAuthSql(
  sql: string,
  input: { amount: number; paid: boolean; kind?: string; status?: string; pickupType?: string },
) {
  if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
    return {
      status: input.status ?? 'ready_for_pickup',
      pickup_type: input.pickupType ?? 'courier_pickup',
      commercial_model: 'canonical',
      payment_responsibility: 'receiver_pays',
    };
  }
  if (sqlIncludes(sql, 'FROM parcel_charges')) {
    return recipientChargeRow({
      kind: input.kind ?? 'outbound_delivery',
      amount: input.amount,
    });
  }
  if (sqlIncludes(sql, 'FROM parcel_payments') && sqlIncludes(sql, "status = 'completed'")) {
    return input.paid ? { id: 'pay-1' } : null;
  }
  return undefined;
}

function relationsRow(
  overrides: Partial<Record<string, unknown>> = {},
  compartment: { id: string; label: string; size: string } | null = {
    id: 'comp-1',
    label: 'A1',
    size: 'medium',
  },
) {
  return {
    ...parcelRow(overrides),
    locker_row: lockerRow({ type: 'SMART_LOCKER', status: 'active' }),
    business_row: businessRow(),
    compartment_json: compartment,
  };
}

describe('ParcelRepository', () => {
  const findCustomerByPhone = vi.fn();
  const dispatchForNewParcel = vi.fn();
  const notifyParcelCreatedForCustomer = vi.fn();
  const notifyParcelStatusChange = vi.fn();

  let db = createSqlMatchMock(() => null);
  let repo: ParcelRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'INSERT INTO parcel_events')) {
        return parcelEventRow({
          event_type: typeof values?.[4] === 'string' ? values[4] : 'parcel.created',
          parcel_id: typeof values?.[0] === 'string' ? values[0] : 'parcel-1',
        });
      }
      return resolve(sql, values);
    });
    txDb.current = db;
    repo = new ParcelRepository(
      db,
      { notifyParcelCreatedForCustomer, notifyParcelStatusChange } as never,
      { dispatchForNewParcel } as never,
      { findCustomerByPhone } as never,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    findCustomerByPhone.mockResolvedValue(null);
    dispatchForNewParcel.mockResolvedValue({
      status: 'pending',
      deepLink: 'eveider://invite/token',
      webLink: 'http://localhost:3000/invite/token',
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
    });
  });

  it('creates shipment for active business scope', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id') || sqlIncludes(sql, 'SELECT * FROM lockers')) {
        return lockerRow({
          id: 'locker-1',
          type: 'SMART_LOCKER',
          latitude: -4.3,
          longitude: 15.3,
          max_capacity: 20,
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
        return [{ status: 'available', size: 'medium' }];
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
        return compartmentRow({ id: 'comp-1', status: 'available', size: 'medium' });
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [];
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE tracking_number')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcels')) {
        return parcelRow({
          tracking_number: 'EVD26TEST0001A',
          pickup_type: 'merchant_dropoff',
          commercial_model: 'canonical',
        });
      }
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) {
        return deliveryPricingRow();
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_charges')) {
        return recipientChargeRow({ amount: 700 });
      }
      if (sqlIncludes(sql, 'SELECT name FROM businesses')) {
        return { name: 'Pharmacy' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const result = await repo.create(ctx, shipmentInput);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parcels'),
      expect.arrayContaining(['biz-1', 'PK-001', '+243000000000']),
    );
    expect(result.parcel.trackingNumber).toBeTruthy();
    expect(result.recipientStatus).toBe('invited');
    expect(dispatchForNewParcel).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parcel_charges'),
      expect.arrayContaining(['locker_collection', 'recipient', 700]),
    );
    expect(txLog.committed).toBe(true);
    expect(txLog.rolledBack).toBe(false);
  });

  it('creates Flow 1 with one outbound_delivery charge for the recipient', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id') || sqlIncludes(sql, 'SELECT * FROM lockers')) {
        return lockerRow({
          id: 'locker-1',
          type: 'SMART_LOCKER',
          latitude: -4.3,
          longitude: 15.3,
          max_capacity: 20,
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
        return [{ status: 'available', size: 'medium' }];
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
        return compartmentRow({ id: 'comp-1', status: 'available', size: 'medium' });
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [];
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE tracking_number')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcels')) {
        return parcelRow({
          tracking_number: 'EVD26TEST0001A',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
        });
      }
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) {
        return deliveryPricingRow();
      }
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          outbound_delivery_amount: 1500,
          return_delivery_amount: 1800,
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_charges')) {
        return recipientChargeRow({
          kind: 'outbound_delivery',
          amount: 1500,
          pricing_zone_id: 'zone-1',
        });
      }
      if (sqlIncludes(sql, 'SELECT name FROM businesses')) {
        return { name: 'Pharmacy' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const result = await repo.create(ctx, {
      ...shipmentInput,
      pickupType: 'courier_pickup',
      senderAddress: '12 Ave Mobutu',
    });

    expect(result.parcel.id).toBe('parcel-1');
    const chargeInserts = (db.query as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO parcel_charges'),
    );
    expect(chargeInserts).toHaveLength(1);
    expect(chargeInserts[0]?.[1]).toEqual(
      expect.arrayContaining(['outbound_delivery', 'recipient', 1500]),
    );
  });

  it('rolls back parcel creation when canonical charge insertion fails', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id') || sqlIncludes(sql, 'SELECT * FROM lockers')) {
        return lockerRow({
          id: 'locker-1',
          type: 'SMART_LOCKER',
          latitude: -4.3,
          longitude: 15.3,
          max_capacity: 20,
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
        return [{ status: 'available', size: 'medium' }];
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
        return compartmentRow({ id: 'comp-1', status: 'available', size: 'medium' });
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [];
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE tracking_number')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcels')) {
        return parcelRow({ commercial_model: 'canonical' });
      }
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) {
        return deliveryPricingRow();
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_charges')) {
        throw new Error('charge insert failed');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    await expect(repo.create(ctx, shipmentInput)).rejects.toThrow('charge insert failed');
    expect(txLog.begun).toBe(true);
    expect(txLog.rolledBack).toBe(true);
    expect(txLog.committed).toBe(false);
    expect(dispatchForNewParcel).not.toHaveBeenCalled();
  });

  it('rejects parcel creation for a partner point', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id') || sqlIncludes(sql, 'SELECT * FROM lockers')) {
        return lockerRow({ id: 'locker-1', type: 'PARTNER_POINT' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    await expect(repo.create(ctx, shipmentInput)).rejects.toThrow('casiers intelligents');
  });

  it('rejects COD parcel creation', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id') || sqlIncludes(sql, 'SELECT * FROM lockers')) {
        return lockerRow({
          id: 'locker-1',
          type: 'SMART_LOCKER',
          latitude: -4.3,
          longitude: 15.3,
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
        return [{ status: 'available', size: 'medium' }];
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    await expect(
      repo.create(ctx, { ...shipmentInput, paymentResponsibility: 'cod' }),
    ).rejects.toThrow('n’est pas disponible');
  });

  it('rejects parcel creation when business cannot submit', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses')) {
        return businessRow({ status: 'suspended' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });

    await expect(repo.create(ctx, shipmentInput)).rejects.toThrow('cannot submit parcels');
  });

  it('applies domain transition on status update', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created', pickup_type: 'courier_pickup', locker_id: null });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'in_transit', pickup_type: 'courier_pickup', locker_id: null });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('courier');
    await repo.updateStatus(ctx, 'parcel-1', 'in_transit');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE parcels\s+SET status/),
      ['in_transit', 'parcel-1'],
    );
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'in_transit');
  });

  it('creates pickup PIN when status becomes ready_for_pickup', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'delivered_to_locker' });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'ready_for_pickup' as ParcelStatus });
      }
      if (sqlIncludes(sql, 'FROM pickup_pins')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT locker_id FROM parcels')) {
        return { locker_id: 'locker-1' };
      }
      if (sqlIncludes(sql, 'FROM pickup_pins pp') || sqlIncludes(sql, 'INNER JOIN parcels p')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await repo.updateStatus(ctx, 'parcel-1', 'ready_for_pickup');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pickup_pins'),
      expect.arrayContaining(['parcel-1']),
    );
  });

  it('rejects invalid parcel transition', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'collected')).rejects.toThrow();
  });

  it('lets the customer mark a ready parcel as collected and frees the compartment', async () => {
    let loadCount = 0;
    const customerParcel = {
      ...parcelRow({
        status: 'ready_for_pickup',
        customer_id: 'user-1',
        compartment_id: 'comp-1',
      }),
      locker_row: lockerRow(),
      business_relation_id: 'biz-1',
      business_name: 'Pharmacy',
      compartment_json: { id: 'comp-1', label: 'A1' },
      pickup_pin_row: {
        id: 'pin-1',
        parcel_id: 'parcel-1',
        code: '482913',
        expires_at: null,
        created_at: new Date(),
      },
      latest_delivery_status: 'completed',
    };

    setup((sql) => {
      const auth = collectionAuthSql(sql, { amount: 0, paid: false, kind: 'locker_collection' });
      if (auth !== undefined) return auth;
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'LEFT JOIN pickup_pins')) {
        loadCount += 1;
        if (loadCount === 1) return customerParcel;
        return { ...customerParcel, status: 'collected' };
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'DELETE FROM pickup_pins')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243000000000',
    });
    const result = await repo.markCollectedByCustomer(ctx, 'parcel-1');

    expect(result.status).toBe('collected');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcels SET status'),
      ['collected', 'parcel-1'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE compartments SET status'),
      ['comp-1'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pickup_pins'),
      ['parcel-1'],
    );
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'collected');
  });

  it('rejects collect when the parcel is not ready for pickup', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'LEFT JOIN pickup_pins')) {
        return {
          ...parcelRow({ status: 'in_transit', customer_id: 'user-1' }),
          locker_row: lockerRow(),
          business_relation_id: 'biz-1',
          business_name: 'Pharmacy',
          compartment_json: null,
          pickup_pin_row: null,
          latest_delivery_status: 'scanned',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    await expect(repo.markCollectedByCustomer(ctx, 'parcel-1')).rejects.toThrow(
      'pas prêt au retrait',
    );
  });

  it('lists business colis with latest delivery in one query', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'latest_delivery_status')) {
        return {
          id: 'parcel-1',
          tracking_number: 'EVD26TEST0001A',
          reference: 'PK-001',
          status: 'created',
          pickup_type: 'courier_pickup',
          recipient_name: 'Client',
          recipient_phone: '+243000000000',
          created_at: new Date('2026-01-15T12:00:00.000Z'),
          locker_name: 'Gombe',
          locker_address: 'Boulevard du 30 Juin',
          latest_delivery_status: 'assigned',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const rows = await repo.listBusinessColis(ctx, 'biz-1');

    expect(rows).toEqual([
      {
        id: 'parcel-1',
        trackingNumber: 'EVD26TEST0001A',
        reference: 'PK-001',
        status: 'created',
        pickupType: 'courier_pickup',
        recipientName: 'Client',
        recipientPhone: '+243000000000',
        locker: { name: 'Gombe', address: 'Boulevard du 30 Juin' },
        latestDeliveryStatus: 'assigned',
        latestDeliveryKind: null,
        customerReturn: null,
        createdAt: new Date('2026-01-15T12:00:00.000Z'),
      },
    ]);
  });

  it('loads a business parcel with latest delivery status', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'latest_delivery_status') && sqlIncludes(sql, 'business_id = $2')) {
        return {
          ...parcelRow({ pickup_type: 'courier_pickup' }),
          locker_row: lockerRow(),
          business_row: businessRow(),
          compartment_json: null,
          latest_delivery_status: 'assigned',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const parcel = await repo.findForBusiness(ctx, 'biz-1', 'parcel-1');

    expect(parcel?.latestDeliveryStatus).toBe('assigned');
    expect(parcel?.latestDeliveryKind).toBeNull();
    expect(parcel?.pickupType).toBe('courier_pickup');
    expect(parcel?.id).toBe('parcel-1');
  });

  it('looks up a business parcel by tracking number', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT id FROM parcels WHERE tracking_number')) {
        return { id: 'parcel-1' };
      }
      if (sqlIncludes(sql, 'latest_delivery_status') && sqlIncludes(sql, 'business_id = $2')) {
        return {
          ...parcelRow(),
          locker_row: lockerRow(),
          business_row: businessRow(),
          compartment_json: null,
          latest_delivery_status: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const parcel = await repo.findForBusinessByIdOrTracking(ctx, 'biz-1', 'EVD26TEST0001A');
    expect(parcel?.id).toBe('parcel-1');
    expect(parcel?.trackingNumber).toBe('EVD26TEST0001A');
  });

  it('rejects customer locker reselection', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'LEFT JOIN pickup_pins')) {
        return {
          ...parcelRow({ status: 'created', customer_id: 'user-1', locker_id: null }),
          locker_row: null,
          business_relation_id: 'biz-1',
          business_name: 'Pharmacy',
          compartment_json: null,
          pickup_pin_row: null,
          latest_delivery_status: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    await expect(repo.assignLockerByCustomer(ctx, 'parcel-1', 'locker-2')).rejects.toThrow(
      'ne peut plus être modifié',
    );
  });

  it('rejects merchant drop-off moving to in_transit', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created', pickup_type: 'merchant_dropoff' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'in_transit')).rejects.toThrow(
      'ne passe pas en transit',
    );
  });

  it('rejects a manual AT_POINT status change', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'in_transit', pickup_type: 'courier_pickup' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'delivered_to_locker')).rejects.toThrow(
      'opération de dépôt',
    );
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
  });

  it('stops merchant deposit at AT_POINT without PIN or ready notification', async () => {
    let loadCount = 0;
    const pinInserts: unknown[][] = [];

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'row_to_json')) {
        loadCount += 1;
        if (loadCount === 1) {
          return relationsRow({ status: 'created', pickup_type: 'merchant_dropoff' });
        }
        return relationsRow({
          status: 'delivered_to_locker',
          pickup_type: 'merchant_dropoff',
          compartment_id: 'comp-1',
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
        return compartmentRow({ id: 'comp-1', status: 'available', size: 'medium' });
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, "SET status = 'delivered_to_locker'") || sqlIncludes(sql, 'COALESCE')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        pinInserts.push(values ?? []);
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    const result = await repo.confirmMerchantDeposit(ctx, 'parcel-1', 'comp-1');

    expect(result.status).toBe('delivered_to_locker');
    expect(pinInserts).toHaveLength(0);
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
    const chargeInserts = (db.query as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO parcel_charges'),
    );
    expect(chargeInserts).toHaveLength(0);
  });

  it('prepares collection from AT_POINT and is idempotent', async () => {
    let status: ParcelStatus = 'delivered_to_locker';
    let pin: { id: string } | null = null;
    let statusUpdates = 0;
    let pinInserts = 0;

    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status, pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        statusUpdates += 1;
        status = 'ready_for_pickup';
        return parcelRow({ status, pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'SELECT id FROM pickup_pins')) {
        return pin;
      }
      if (sqlIncludes(sql, 'SELECT locker_id FROM parcels')) {
        return { locker_id: 'locker-1' };
      }
      if (sqlIncludes(sql, 'FROM pickup_pins pp') || sqlIncludes(sql, 'INNER JOIN parcels p')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        pinInserts += 1;
        pin = { id: 'pin-1' };
        return null;
      }
      if (sqlIncludes(sql, 'FROM pickup_pins')) {
        return pin;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    const first = await repo.prepareCollection(ctx, 'parcel-1');
    const second = await repo.prepareCollection(ctx, 'parcel-1');

    expect(first.status).toBe('ready_for_pickup');
    expect(second.status).toBe('ready_for_pickup');
    expect(statusUpdates).toBe(1);
    expect(pinInserts).toBe(1);
    expect(notifyParcelStatusChange).toHaveBeenCalledTimes(1);
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'ready_for_pickup');
  });

  it('rejects collection preparation before AT_POINT', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'in_transit', pickup_type: 'courier_pickup' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.prepareCollection(ctx, 'parcel-1')).rejects.toThrow(
      'arrivé au casier',
    );
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
  });

  it('releases the compartment when admin marks a parcel collected', async () => {
    let loadCount = 0;

    setup((sql) => {
      const auth = collectionAuthSql(sql, {
        amount: 1500,
        paid: true,
        kind: 'outbound_delivery',
        pickupType: 'courier_pickup',
      });
      if (auth !== undefined) return auth;
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          compartment_id: 'comp-1',
        });
      }
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'row_to_json')) {
        loadCount += 1;
        return relationsRow({
          status: loadCount === 1 ? 'ready_for_pickup' : 'collected',
          pickup_type: 'courier_pickup',
          compartment_id: 'comp-1',
        });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'DELETE FROM pickup_pins')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    const result = await repo.updateStatus(ctx, 'parcel-1', 'collected');

    expect(result.status).toBe('collected');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE compartments SET status'),
      ['comp-1'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pickup_pins'),
      ['parcel-1'],
    );
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'collected');
  });

  it('rejects customer collect when a canonical recipient charge is unpaid', async () => {
    setup((sql) => {
      const auth = collectionAuthSql(sql, {
        amount: 1500,
        paid: false,
        kind: 'outbound_delivery',
      });
      if (auth !== undefined) return auth;
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'LEFT JOIN pickup_pins')) {
        return {
          ...parcelRow({
            status: 'ready_for_pickup',
            customer_id: 'user-1',
            pickup_type: 'courier_pickup',
            commercial_model: 'canonical',
          }),
          locker_row: lockerRow(),
          business_relation_id: 'biz-1',
          business_name: 'Pharmacy',
          compartment_json: { id: 'comp-1', label: 'A1' },
          pickup_pin_row: null,
          latest_delivery_status: 'completed',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243000000000',
    });
    await expect(repo.markCollectedByCustomer(ctx, 'parcel-1')).rejects.toThrow(
      'Paiement requis avant le retrait',
    );
  });

  it('rejects admin collect when a canonical recipient charge is unpaid', async () => {
    setup((sql) => {
      const auth = collectionAuthSql(sql, {
        amount: 5000,
        paid: false,
        kind: 'outbound_delivery',
        pickupType: 'courier_pickup',
      });
      if (auth !== undefined) return auth;
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
        });
      }
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'row_to_json')) {
        return relationsRow({
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'collected')).rejects.toThrow(
      'Paiement requis avant le retrait',
    );
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
  });

  it('rejects admin COLLECTED before READY_FOR_PICKUP so the compartment stays occupied', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({
          status: 'delivered_to_locker',
          pickup_type: 'courier_pickup',
          compartment_id: 'comp-1',
        });
      }
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'row_to_json')) {
        return relationsRow({
          status: 'delivered_to_locker',
          pickup_type: 'courier_pickup',
          compartment_id: 'comp-1',
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'collected')).rejects.toThrow(
      'prêt pour retrait',
    );
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE compartments SET status'),
      expect.anything(),
    );
  });
});
