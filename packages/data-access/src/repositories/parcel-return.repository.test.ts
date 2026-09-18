import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import type { Queryable } from '../db/pool.js';
import {
  compartmentRow,
  createSqlMatchMock,
  lockerRow,
  parcelEventRow,
  parcelReturnRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { ParcelReturnRepository } from './parcel-return.repository.js';

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

function parcelSelect(overrides: Record<string, unknown> = {}) {
  const row = parcelRow({ customer_id: 'user-1', status: 'collected', ...overrides });
  return {
    id: row.id,
    business_id: row.business_id,
    customer_id: row.customer_id,
    recipient_phone: row.recipient_phone,
    status: row.status,
    locker_id: row.locker_id,
    compartment_id: row.compartment_id,
  };
}

describe('ParcelReturnRepository', () => {
  const customerCtx = createDataAccessContext('customer', { userId: 'user-1' });
  const businessCtx = createDataAccessContext('business', {
    userId: 'biz-user-1',
    businessId: 'biz-1',
    businessUserRole: 'logistics_manager',
  });

  let db = createSqlMatchMock(() => null);
  let repo: ParcelReturnRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'INSERT INTO parcel_events')) {
        return parcelEventRow({
          event_type: typeof values?.[4] === 'string' ? values[4] : 'parcel_return.requested',
        });
      }
      return resolve(sql, values);
    });
    txDb.current = db;
    repo = new ParcelReturnRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a request only after COLLECTED', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'collected' });
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_returns')) {
        return parcelReturnRow();
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return { ...parcelReturnRow(), return_locker_json: null, compartment_label: null };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const created = await repo.requestByCustomer(customerCtx, 'parcel-1');
    expect(created.status).toBe('requested');
  });

  it.each([
    'created',
    'in_transit',
    'delivered_to_locker',
    'ready_for_pickup',
    'return_at_point',
    'returning',
    'returned',
  ] as const)('rejects a request from %s', async (status) => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.requestByCustomer(customerCtx, 'parcel-1')).rejects.toThrow(
      'après le retrait',
    );
  });

  it('rejects a second active return via unique constraint', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'collected' });
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_returns')) {
        const error = new Error('duplicate') as Error & { code: string };
        error.code = '23505';
        throw error;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.requestByCustomer(customerCtx, 'parcel-1')).rejects.toThrow(
      'déjà en cours',
    );
  });

  it('authorizes a requested return with method and SMART_LOCKER', async () => {
    let authorized = false;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'WHERE pr.id')) {
        return {
          ...parcelReturnRow({
            status: authorized ? 'authorized' : 'requested',
            method: authorized ? 'eveider_return' : null,
            return_locker_id: authorized ? 'locker-1' : null,
            return_code: authorized ? '482913' : null,
          }),
          return_locker_json: authorized
            ? { id: 'locker-1', name: 'Gombe', address: 'Ave 1' }
            : null,
          compartment_label: null,
        };
      }
      if (sqlIncludes(sql, 'SELECT id FROM parcel_returns WHERE return_code')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id')) {
        return lockerRow({ type: 'SMART_LOCKER', status: 'active' });
      }
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) {
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
          locker_collection_amount: 500,
          return_locker_amount: 400,
          updated_at: new Date(),
          updated_by: null,
        };
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
        return {
          id: 'charge-1',
          parcel_id: 'parcel-1',
          business_id: 'biz-1',
          kind: 'return_delivery',
          status: 'owed',
          payer: 'business',
          pricing_zone_id: 'zone-1',
          amount: 1800,
          currency: 'CDF',
          unit_rate: null,
          quantity: null,
          period_started_at: null,
          period_ended_at: null,
          locked_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      if (sqlIncludes(sql, 'UPDATE parcel_returns')) {
        authorized = true;
        return parcelReturnRow({ status: 'authorized' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const updated = await repo.authorize(businessCtx, 'return-1', {
      method: 'eveider_return',
      returnLockerId: 'locker-1',
    });
    expect(updated.status).toBe('authorized');
    expect(updated.method).toBe('eveider_return');
    const chargeInserts = (db.query as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO parcel_charges'),
    );
    expect(chargeInserts).toHaveLength(1);
    expect(chargeInserts[0]?.[1]).toEqual(
      expect.arrayContaining(['return_delivery', 'business', 1800]),
    );
  });

  it('rejects partner/residential points at authorization', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return {
          ...parcelReturnRow({ status: 'requested' }),
          return_locker_json: null,
          compartment_label: null,
        };
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id')) {
        return lockerRow({ type: 'PARTNER_POINT', status: 'active' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.authorize(businessCtx, 'return-1', {
        method: 'business_pickup',
        returnLockerId: 'locker-1',
      }),
    ).rejects.toThrow('casiers intelligents');
  });

  it('rejects authorizing an already rejected return', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return {
          ...parcelReturnRow({ status: 'rejected' }),
          return_locker_json: null,
          compartment_label: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.authorize(businessCtx, 'return-1', {
        method: 'eveider_return',
        returnLockerId: 'locker-1',
      }),
    ).rejects.toThrow('plus en attente');
  });

  it('deposits an authorized return, occupying a compartment', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'collected' });
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'status = ANY')) {
        return {
          ...parcelReturnRow({
            status: 'authorized',
            method: 'business_pickup',
            return_locker_id: 'locker-1',
            return_code: '123456',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: null,
        };
      }
      if (sqlIncludes(sql, 'FROM lockers WHERE id')) {
        return lockerRow({ type: 'SMART_LOCKER', status: 'active' });
      }
      if (sqlIncludes(sql, 'FROM compartments')) {
        return compartmentRow({ status: 'available' });
      }
      if (sqlIncludes(sql, 'UPDATE compartments') || sqlIncludes(sql, 'UPDATE parcels') || sqlIncludes(sql, 'UPDATE parcel_returns')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'WHERE pr.id')) {
        return {
          ...parcelReturnRow({
            status: 'awaiting_pickup',
            method: 'business_pickup',
            return_locker_id: 'locker-1',
            compartment_id: 'comp-1',
            return_code: '123456',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: 'A1',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const updated = await repo.confirmRecipientDeposit(customerCtx, 'parcel-1', {
      lockerId: 'locker-1',
      returnCode: '123456',
    });
    expect(updated.status).toBe('awaiting_pickup');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE compartments SET status = 'occupied'"),
      ['comp-1'],
    );
  });

  it('rejects deposit at the wrong locker and before authorization', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'collected' });
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return {
          ...parcelReturnRow({
            status: 'authorized',
            method: 'eveider_return',
            return_locker_id: 'locker-1',
            return_code: '123456',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.confirmRecipientDeposit(customerCtx, 'parcel-1', {
        lockerId: 'locker-other',
        returnCode: '123456',
      }),
    ).rejects.toThrow('mauvais casier');
  });

  it('repeats a confirmed deposit without corrupting state', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'return_at_point', locker_id: 'locker-1', compartment_id: 'comp-1' });
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return {
          ...parcelReturnRow({
            status: 'awaiting_pickup',
            method: 'eveider_return',
            return_locker_id: 'locker-1',
            compartment_id: 'comp-1',
            return_code: '123456',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: 'A1',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const updated = await repo.confirmRecipientDeposit(customerCtx, 'parcel-1', {
      lockerId: 'locker-1',
      returnCode: '123456',
    });
    expect(updated.status).toBe('awaiting_pickup');
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE compartments SET status = 'occupied'"),
      expect.anything(),
    );
  });

  it('completes business pickup without creating a Livraison', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelSelect({ status: 'return_at_point', compartment_id: 'comp-1' });
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'status = ANY')) {
        return {
          ...parcelReturnRow({
            status: 'awaiting_pickup',
            method: 'business_pickup',
            return_locker_id: 'locker-1',
            compartment_id: 'comp-1',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: 'A1',
        };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, "kind = 'customer_return'")) {
        return null;
      }
      if (
        sqlIncludes(sql, 'UPDATE compartments') ||
        sqlIncludes(sql, 'UPDATE parcels') ||
        sqlIncludes(sql, 'UPDATE parcel_returns')
      ) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'WHERE pr.id')) {
        return {
          ...parcelReturnRow({
            status: 'completed',
            method: 'business_pickup',
            return_locker_id: 'locker-1',
          }),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: 'A1',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const updated = await repo.confirmBusinessPickup(businessCtx, 'parcel-1');
    expect(updated.status).toBe('completed');
    expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO deliveries'), expect.anything());
  });

  it('does not treat historical RTS deliveries as a customer return', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_returns pr')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.findLatestForParcel('parcel-1')).resolves.toBeNull();
  });
});
