import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import type { Queryable } from '../db/pool.js';
import {
  compartmentRow,
  courierDeliveryJoin,
  createSqlMatchMock,
  deliveryRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { DeliveryRepository } from './delivery.repository.js';

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

describe('DeliveryRepository', () => {
  const notifyParcelStatusChange = vi.fn();
  const notifyParcelCreatedForCustomer = vi.fn();
  const notifications = { notifyParcelStatusChange, notifyParcelCreatedForCustomer };

  const courierCtx = createDataAccessContext('courier', { userId: 'courier-1' });
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  let db = createSqlMatchMock(() => null);
  let repo: DeliveryRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    txDb.current = db;
    repo = new DeliveryRepository(db, notifications as never);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns delivery for admin when parcel has locker', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow();
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
        return deliveryRow();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.assign(adminCtx, 'parcel-1', 'courier-1');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO deliveries'),
      ['parcel-1', 'courier-1'],
    );
  });

  it('rejects assign when active delivery exists', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow();
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return { id: 'existing' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.assign(adminCtx, 'parcel-1', 'courier-1')).rejects.toThrow(
      'livraison active',
    );
  });

  it('scans parcel with matching reference', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'assigned' }, { status: 'created' });
        }
        return courierDeliveryJoin(
          { status: 'scanned', scanned_at: new Date() },
          { status: 'in_transit' },
        );
      }
      if (sqlIncludes(sql, 'UPDATE deliveries SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created' });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'in_transit' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.scan(courierCtx, 'delivery-1', 'pk-001');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE deliveries SET status'),
      expect.arrayContaining(['scanned', 'delivery-1']),
    );
    expect(result.status).toBe('scanned');
  });

  it('rejects scan with wrong reference', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d')) {
        return courierDeliveryJoin();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.scan(courierCtx, 'delivery-1', 'WRONG')).rejects.toThrow('incorrecte');
  });

  it('rejects courier access to another courier delivery', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d')) {
        return courierDeliveryJoin({ courier_id: 'other-courier' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.findByIdForCourier(courierCtx, 'delivery-1')).rejects.toThrow('périmètre');
  });

  it('lists active deliveries for admin with filters', async () => {
    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN users')) {
        expect(values).toEqual(expect.arrayContaining(['scanned', 'courier-1']));
        return [
          {
            ...deliveryRow({ status: 'scanned' }),
            courier_relation_id: 'courier-1',
            courier_full_name: 'Coursier',
            courier_email: null,
            courier_phone: null,
            parcel_relation_id: 'parcel-1',
            parcel_tracking_number: 'EVD26TEST0001A',
            parcel_reference: 'PK-001',
            parcel_status: 'in_transit',
            parcel_recipient_name: 'Client',
            parcel_recipient_phone: '+243000000000',
            locker_relation_id: 'locker-1',
            locker_name: 'EVEIDER GOMBE',
            locker_address: 'Gombe',
            business_relation_id: 'biz-1',
            business_name: 'Shop',
          },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const items = await repo.listForAdmin(adminCtx, {
      status: 'scanned',
      courierId: 'courier-1',
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe('scanned');
    expect(items[0]?.courierId).toBe('courier-1');
  });

  it('summarizes active delivery counts for admin', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'GROUP BY status') && sqlIncludes(sql, 'FROM deliveries')) {
        return [
          { status: 'assigned', count: 2 },
          { status: 'scanned', count: 1 },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getActiveSummary(adminCtx);

    expect(summary).toEqual({
      assigned: 2,
      scanned: 1,
      drop_off_pending: 0,
      total: 3,
    });
  });

  it('completes drop-off with sequential transaction writes', async () => {
    let loadCount = 0;
    const writes: string[] = [];

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin(
            { status: 'drop_off_pending' },
            { status: 'in_transit', compartment_id: null },
          );
        }
        return courierDeliveryJoin(
          { status: 'completed', completed_at: new Date() },
          { status: 'ready_for_pickup', compartment_id: 'comp-1' },
        );
      }
      if (sqlIncludes(sql, 'FROM compartments') && sqlIncludes(sql, "status = 'available'")) {
        return compartmentRow();
      }
      if (sqlIncludes(sql, 'FROM pickup_pins')) {
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE deliveries SET status')) {
        writes.push('delivery');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        writes.push('compartment');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        writes.push('parcel');
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        writes.push('pin');
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.completeDropOff(courierCtx, 'delivery-1');

    expect(writes).toEqual(['delivery', 'compartment', 'parcel', 'pin']);
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'ready_for_pickup');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE compartments SET status'),
      ['comp-1'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcels SET status'),
      expect.arrayContaining(['ready_for_pickup', 'comp-1', 'parcel-1']),
    );
  });
});
