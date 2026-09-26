import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import type { Queryable } from '../db/pool.js';
import {
  compartmentRow,
  courierDeliveryJoin,
  createSqlMatchMock,
  deliveryRow,
  parcelEventRow,
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
  const jpegPhoto = `data:image/jpeg;base64,${Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 40 }, () => 0),
  ]).toString('base64')}`;
  const notifyParcelStatusChange = vi.fn();
  const notifyParcelCreatedForCustomer = vi.fn();
  const notifyCourierAssigned = vi.fn();
  const notifications = {
    notifyParcelStatusChange,
    notifyParcelCreatedForCustomer,
    notifyCourierAssigned,
  };

  const courierCtx = createDataAccessContext('courier', { userId: 'courier-1' });
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });
  const businessCtx = createDataAccessContext('business', {
    userId: 'biz-user-1',
    businessId: 'biz-1',
    businessUserRole: 'logistics_manager',
  });

  let db = createSqlMatchMock(() => null);
  let repo: DeliveryRepository;

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
          delivery_id: values?.[1] == null ? null : String(values[1]),
        });
      }
      return resolve(sql, values);
    });
    txDb.current = db;
    repo = new DeliveryRepository(db, notifications as never);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns delivery for admin when parcel has locker', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'active', business_id: null };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
        return deliveryRow();
      }
      if (sqlIncludes(sql, 'SELECT name FROM lockers')) {
        return { name: 'EVEIDER GOMBE' };
      }
      if (sqlIncludes(sql, 'SELECT name FROM businesses')) {
        return { name: 'Mulikap' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.assign(adminCtx, 'parcel-1', 'courier-1');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO deliveries'),
      ['parcel-1', 'courier-1', 'outbound'],
    );
    expect(notifyCourierAssigned).toHaveBeenCalledWith({
      courierId: 'courier-1',
      deliveryId: 'delivery-1',
      parcelId: 'parcel-1',
      trackingNumber: 'EVD26TEST0001A',
      businessName: 'Mulikap',
      lockerName: 'EVEIDER GOMBE',
      kind: 'outbound',
    });
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE parcels\s+SET status/),
      expect.anything(),
    );
  });

  it('does not consult driver zone when assigning a delivery', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'active', business_id: null, service_area_id: 'zone-a' };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
        return deliveryRow();
      }
      if (sqlIncludes(sql, 'SELECT name FROM lockers')) {
        return { name: 'EVEIDER GOMBE' };
      }
      if (sqlIncludes(sql, 'SELECT name FROM businesses')) {
        return { name: 'Mulikap' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.assign(adminCtx, 'parcel-1', 'courier-1');

    const sqls = (db.query as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(sqls.some((sql) => sql.includes('service_area'))).toBe(false);
  });

  it('rejects business assignment of any driver', async () => {
    setup(() => {
      throw new Error('Unexpected SQL');
    });

    await expect(repo.assign(businessCtx, 'parcel-1', 'courier-1')).rejects.toThrow(
      'Eveider Operations',
    );
  });

  it('rejects assign when active delivery exists', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'active', business_id: null };
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

  it('rejects assigning an Eveider fleet driver whose KYC is still pending', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return {
          id: 'courier-1',
          role: 'courier',
          business_id: 'biz-1',
          is_blocked: false,
          deactivated_at: null,
          deleted_at: null,
        };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'pending_review', business_id: null, contractor_type: 'eveider' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.assign(adminCtx, 'parcel-1', 'courier-1')).rejects.toThrow(
      'pas encore approuvé',
    );
  });

  it('rejects assigning a business contractor as an Eveider driver', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return {
          id: 'courier-1',
          role: 'courier',
          is_blocked: false,
          deactivated_at: null,
          deleted_at: null,
        };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'active', business_id: 'biz-1', contractor_type: 'business' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.assign(adminCtx, 'parcel-1', 'courier-1')).rejects.toThrow(
      'chauffeurs Eveider',
    );
  });

  it('confirms pickup with matching scan after start', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'started' }, { status: 'created' });
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
        return parcelRow({ status: 'created', pickup_type: 'courier_pickup' });
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
        return courierDeliveryJoin({ status: 'started' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.scan(courierCtx, 'delivery-1', 'WRONG')).rejects.toThrow('incorrecte');
  });

  it('rejects pickup confirm before start', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d')) {
        return courierDeliveryJoin({ status: 'accepted' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.scan(courierCtx, 'delivery-1', 'pk-001')).rejects.toThrow('démarrage');
  });

  it('accepts assigned delivery', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'assigned' });
        }
        return courierDeliveryJoin({ status: 'accepted', accepted_at: new Date() });
      }
      if (sqlIncludes(sql, 'UPDATE deliveries')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.accept(courierCtx, 'delivery-1');
    expect(result.status).toBe('accepted');
  });

  it('starts accepted delivery', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'accepted' });
        }
        return courierDeliveryJoin({ status: 'started', started_at: new Date() });
      }
      if (sqlIncludes(sql, 'UPDATE deliveries')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.start(courierCtx, 'delivery-1');
    expect(result.status).toBe('started');
  });

  it('confirms pickup manually without barcode', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'started' }, { status: 'created' });
        }
        return courierDeliveryJoin({ status: 'scanned', scanned_at: new Date() });
      }
      if (sqlIncludes(sql, 'UPDATE deliveries SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created', pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'in_transit' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.confirmPickup(courierCtx, 'delivery-1', { mode: 'manual' });
    expect(result.status).toBe('scanned');
  });

  it('rejects courier access to another courier delivery', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d')) {
        return courierDeliveryJoin({ driver_id: 'other-courier' });
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
      accepted: 0,
      started: 0,
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
          { status: 'delivered_to_locker', compartment_id: 'comp-1' },
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
      if (sqlIncludes(sql, 'UPDATE parcels') && sqlIncludes(sql, 'SET status')) {
        writes.push('parcel');
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        writes.push('pin');
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.completeDropOff(courierCtx, 'delivery-1', undefined, jpegPhoto);

    expect(writes).toEqual(['delivery', 'compartment', 'parcel']);
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('drop_off_photo'),
      expect.arrayContaining(['completed', expect.stringContaining('data:image/jpeg;base64,'), 'delivery-1']),
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE compartments SET status'),
      ['comp-1'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcels'),
      expect.arrayContaining(['delivered_to_locker', 'comp-1', 'parcel-1']),
    );
  });

  it('confirms locker outbound deposit from started without photo or READY', async () => {
    const writes: string[] = [];
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        return courierDeliveryJoin(
          { status: 'started', kind: 'outbound' },
          { status: 'in_transit', pickup_type: 'courier_pickup', locker_id: 'locker-1' },
        );
      }
      if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
        return compartmentRow({ id: 'comp-1', status: 'reserved' });
      }
      if (sqlIncludes(sql, 'UPDATE deliveries')) {
        writes.push('delivery');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        writes.push('compartment');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE parcels') && sqlIncludes(sql, 'SET status')) {
        writes.push('parcel');
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        writes.push('pin');
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.confirmLockerOutboundDeposit(adminCtx, {
      deliveryId: 'delivery-1',
      compartmentId: 'comp-1',
    });

    expect(writes).toEqual(['delivery', 'compartment', 'parcel']);
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
  });

  it('does not create new RTS return legs', async () => {
    setup(() => null);

    await expect(repo.assign(adminCtx, 'parcel-1', 'courier-1', 'return')).rejects.toThrow(
      'ne sont plus disponibles',
    );
  });

  it('completes a return drop-off by releasing the compartment', async () => {
    let loadCount = 0;
    const writes: string[] = [];

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin(
            { status: 'drop_off_pending', kind: 'return' },
            { status: 'ready_for_pickup', compartment_id: 'comp-1' },
          );
        }
        return courierDeliveryJoin(
          { status: 'completed', kind: 'return', completed_at: new Date() },
          { status: 'ready_for_pickup', compartment_id: null },
        );
      }
      if (sqlIncludes(sql, 'SELECT ready_for_pickup_at FROM parcels')) {
        return { ready_for_pickup_at: null };
      }
      if (sqlIncludes(sql, 'UPDATE deliveries SET status')) {
        writes.push('delivery');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE compartments SET status')) {
        writes.push('compartment');
        return null;
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET compartment_id')) {
        writes.push('parcel');
        return null;
      }
      if (sqlIncludes(sql, 'DELETE FROM pickup_pins')) {
        writes.push('pin');
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.completeDropOff(courierCtx, 'delivery-1', undefined, jpegPhoto);

    expect(writes).toEqual(['delivery', 'compartment', 'parcel', 'pin']);
    expect(notifyParcelStatusChange).not.toHaveBeenCalled();
  });

  it('marks an in-progress delivery as failed', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        if (loadCount === 1) {
          return courierDeliveryJoin({ status: 'scanned' }, { status: 'in_transit' });
        }
        return courierDeliveryJoin({ status: 'failed' }, { status: 'in_transit' });
      }
      if (sqlIncludes(sql, 'UPDATE deliveries SET status')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.fail(courierCtx, 'delivery-1');
    expect(result.status).toBe('failed');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE deliveries SET status'),
      ['failed', 'delivery-1'],
    );
  });

  it('rejects drop-off completion without a photo', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        return courierDeliveryJoin(
          { status: 'drop_off_pending' },
          { status: 'in_transit', compartment_id: null },
        );
      }
      if (sqlIncludes(sql, 'SELECT id, label FROM compartments')) {
        return { id: 'comp-1', label: 'A1' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.completeDropOff(courierCtx, 'delivery-1')).rejects.toThrow('Photo de dépôt');
  });

  it('summarizes 90-day courier history', async () => {
    setup((sql, values) => {
      if (sqlIncludes(sql, 'COUNT(*) FILTER') && sqlIncludes(sql, 'FROM deliveries')) {
        expect(values).toEqual(['courier-1', 90]);
        return { completed: 8, failed: 2 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.getCourierHistorySummary(courierCtx)).resolves.toEqual({
      days: 90,
      completed: 8,
      failed: 2,
      successRate: 80,
    });
  });

  it('assigns a customer_return livraison for an Eveider driver', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_returns pr') && sqlIncludes(sql, 'status = ANY')) {
        return {
          id: 'return-1',
          parcel_id: 'parcel-1',
          business_id: 'biz-1',
          status: 'awaiting_pickup',
          method: 'eveider_return',
          return_locker_id: 'locker-1',
          compartment_id: 'comp-1',
          return_code: '123456',
          requested_at: new Date(),
          authorized_at: new Date(),
          deposited_at: new Date(),
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Ave 1' },
          compartment_label: 'A1',
        };
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE id')) {
        return parcelRow({ status: 'return_at_point', pickup_type: 'courier_pickup' });
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT * FROM users')) {
        return { id: 'courier-1', role: 'courier' };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return { status: 'active', business_id: null, contractor_type: 'eveider' };
      }
      if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
        return deliveryRow({ kind: 'customer_return' });
      }
      if (sqlIncludes(sql, 'SELECT name FROM lockers')) {
        return { name: 'Kolwezi Point' };
      }
      if (sqlIncludes(sql, 'SELECT tracking_number FROM parcels')) {
        return { tracking_number: 'EVD26TEST0001A' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const delivery = await repo.assign(adminCtx, 'parcel-1', 'courier-1', 'customer_return');
    expect(delivery.kind).toBe('customer_return');
    expect(notifyCourierAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'customer_return',
        deliveryId: 'delivery-1',
        courierId: 'courier-1',
      }),
    );
  });

  it('refuses locker drop-off pending for a customer_return livraison', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        return courierDeliveryJoin(
          { status: 'scanned', kind: 'customer_return' },
          { status: 'returning' },
        );
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.markDropOffPending(courierCtx, 'delivery-1')).rejects.toThrow(
      'chez le marchand',
    );
  });

  it('lists claimable outbound and customer_return work when self-assignment is on', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'driver_self_assignment_enabled')) {
        return { driver_self_assignment_enabled: true };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers') && sqlIncludes(sql, 'is_accepting_work')) {
        return {
          status: 'active',
          contractor_type: 'eveider',
          is_accepting_work: true,
        };
      }
      if (sqlIncludes(sql, "'outbound'::text AS kind")) {
        return [
          {
            parcel_id: 'parcel-out',
            kind: 'outbound',
            tracking_number: 'EVDOUT1',
            reference: null,
            business_name: 'Boutique',
            sender_address: 'Rue 1',
            locker_name: 'Kolwezi',
            locker_address: 'Point',
            due_at: new Date('2026-09-26T16:00:00Z'),
            driver_instructions: 'Portail bleu',
          },
        ];
      }
      if (sqlIncludes(sql, "'customer_return'::text AS kind")) {
        return [
          {
            parcel_id: 'parcel-ret',
            kind: 'customer_return',
            tracking_number: 'EVDRET1',
            reference: null,
            business_name: 'Boutique',
            sender_address: null,
            locker_name: 'Dilala',
            locker_address: 'Manika',
            due_at: new Date('2026-09-26T14:00:00Z'),
            driver_instructions: null,
          },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const items = await repo.listAvailableForClaim(courierCtx);
    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe('customer_return');
    expect(items[0]?.parcelId).toBe('parcel-ret');
    expect(items[1]?.kind).toBe('outbound');
    expect(items[1]?.driverInstructions).toBe('Portail bleu');
  });

  it('hides available pool when driver is not accepting work', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'driver_self_assignment_enabled')) {
        return { driver_self_assignment_enabled: true };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers')) {
        return {
          status: 'active',
          contractor_type: 'eveider',
          is_accepting_work: false,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.listAvailableForClaim(courierCtx)).resolves.toEqual([]);
  });

  it('claims customer_return when return is awaiting Eveider pickup', async () => {
    let loadCount = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'driver_self_assignment_enabled')) {
        return { driver_self_assignment_enabled: true };
      }
      if (sqlIncludes(sql, 'FROM driver_dossiers') && sqlIncludes(sql, 'is_accepting_work')) {
        return {
          status: 'active',
          contractor_type: 'eveider',
          is_accepting_work: true,
        };
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE id') && sqlIncludes(sql, 'FOR UPDATE')) {
        return parcelRow({
          id: 'parcel-ret',
          status: 'return_at_point',
          locker_id: 'locker-1',
        });
      }
      if (sqlIncludes(sql, 'FROM parcel_returns') && sqlIncludes(sql, 'awaiting_pickup')) {
        return {
          id: 'return-1',
          status: 'awaiting_pickup',
          method: 'eveider_return',
          parcel_status: 'return_at_point',
          locker_id: 'locker-1',
        };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'status = ANY')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
        return deliveryRow({
          id: 'delivery-claimed',
          parcel_id: 'parcel-ret',
          status: 'accepted',
          kind: 'customer_return',
          accepted_at: new Date(),
        });
      }
      if (sqlIncludes(sql, 'FROM deliveries d') && sqlIncludes(sql, 'JOIN parcels')) {
        loadCount += 1;
        return courierDeliveryJoin(
          {
            id: 'delivery-claimed',
            status: 'accepted',
            kind: 'customer_return',
            parcel_id: 'parcel-ret',
          },
          { id: 'parcel-ret', status: 'return_at_point' },
        );
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const claimed = await repo.claim(courierCtx, 'parcel-ret', 'customer_return');
    expect(claimed.status).toBe('accepted');
    expect(claimed.kind).toBe('customer_return');
    expect(loadCount).toBeGreaterThan(0);
  });
});
