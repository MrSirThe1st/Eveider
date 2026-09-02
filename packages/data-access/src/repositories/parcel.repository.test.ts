import type { ParcelStatus } from '@eveider/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import type { Queryable } from '../db/pool.js';
import {
  businessRow,
  createSqlMatchMock,
  lockerRow,
  parcelEventRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { ParcelRepository } from './parcel.repository.js';

const txDb: { current: Queryable | null } = { current: null };

vi.mock('../db/pool.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/pool.js')>();
  return {
    ...actual,
    withTransaction: vi.fn(async <T>(fn: (client: Queryable) => Promise<T>) => {
      if (!txDb.current) throw new Error('Test db not set for withTransaction');
      return fn(txDb.current);
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
  packageSize: 'medium' as const,
  packageCategory: 'other' as const,
  paymentResponsibility: 'receiver_pays' as const,
};

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
          type: 'PARTNER_POINT',
          latitude: -4.3,
          longitude: 15.3,
          max_capacity: 20,
        });
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
        return [];
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [];
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE tracking_number')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcels')) {
        return parcelRow({ tracking_number: 'EVD26TEST0001A' });
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
        return parcelRow({ status: 'created', locker_id: null });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'in_transit', locker_id: null });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('courier');
    await repo.updateStatus(ctx, 'parcel-1', 'in_transit');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcels SET status'),
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
});
