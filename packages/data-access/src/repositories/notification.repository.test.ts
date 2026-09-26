import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  createSqlMatchMock,
  notificationRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { NotificationRepository } from './notification.repository.js';

describe('NotificationRepository', () => {
  let db = createSqlMatchMock(() => null);
  let repo: NotificationRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    repo = new NotificationRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.EXPO_ACCESS_TOKEN;
  });

  it('creates typed in-app notification on ready_for_pickup', async () => {
    const inserts: unknown[][] = [];

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'LEFT JOIN lockers')) {
        return {
          ...parcelRow({
            customer_id: 'user-1',
            recipient_phone: '+243800000000',
            reference: 'PK-001',
          }),
          locker_name: 'GOMBE',
        };
      }
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'dedupe_key')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return { id: 'notif-1' };
      }
      if (sqlIncludes(sql, 'push_notifications_enabled')) {
        return { push_notifications_enabled: false };
      }
      return null;
    });

    await repo.notifyParcelStatusChange('parcel-1', 'ready_for_pickup');

    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.[3]).toBe('parcel.ready_for_pickup');
    expect(inserts[0]?.[4]).toBe('Votre colis est disponible');
    expect(String(inserts[0]?.[5])).toContain('prêt au retrait à GOMBE');
  });

  it('does not notify the recipient at AT_POINT', async () => {
    setup(() => {
      throw new Error('AT_POINT must not query notifications');
    });

    await repo.notifyParcelStatusChange('parcel-1', 'delivered_to_locker');
  });

  it('skips duplicate notifications', async () => {
    const inserts: unknown[][] = [];

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM parcels p')) {
        return {
          ...parcelRow({
            customer_id: 'user-1',
            recipient_phone: '+243800000000',
            reference: 'PK-001',
            locker_id: null,
          }),
          locker_name: null,
        };
      }
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'dedupe_key')) {
        return { id: 'existing' };
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return { id: 'notif-new' };
      }
      return null;
    });

    await repo.notifyParcelStatusChange('parcel-1', 'in_transit');

    expect(inserts).toHaveLength(0);
  });

  it('lists notifications for customer', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM notifications n')) {
        expect(values).toEqual(['user-1']);
        return [
          {
            ...notificationRow({ message: 'Test', title: 'Titre', type: 'parcel.ready_for_pickup' }),
            parcel_id_relation: 'parcel-1',
            parcel_tracking_number: 'EVD26TEST0001A',
            parcel_reference: 'PK-001',
          },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const items = await repo.listForCustomer(ctx);

    expect(items).toHaveLength(1);
    expect(items[0]?.message).toBe('Test');
    expect(items[0]?.title).toBe('Titre');
  });

  it('marks notification as read', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    const readAt = new Date('2026-01-15T13:00:00.000Z');

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM notifications WHERE id = $1 AND user_id')) {
        return { id: 'notif-1' };
      }
      if (sqlIncludes(sql, 'UPDATE notifications') && sqlIncludes(sql, 'read_at')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM notifications n') && sqlIncludes(sql, 'WHERE n.id')) {
        return {
          ...notificationRow({ read_at: readAt }),
          parcel_id_relation: 'parcel-1',
          parcel_tracking_number: 'EVD26TEST0001A',
          parcel_reference: 'PK-001',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.markRead(ctx, 'notif-1');
    expect(result.readAt).toBeTruthy();
  });

  it('creates an assignment notification for the courier', async () => {
    const inserts: unknown[][] = [];

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'dedupe_key')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return { id: 'notif-1' };
      }
      if (sqlIncludes(sql, 'push_notifications_enabled')) {
        return { push_notifications_enabled: false };
      }
      return null;
    });

    await repo.notifyCourierAssigned({
      courierId: 'courier-1',
      deliveryId: 'delivery-1',
      parcelId: 'parcel-1',
      trackingNumber: 'EVD26TEST0001A',
      businessName: 'Mulikap',
      lockerName: 'GOMBE',
      kind: 'outbound',
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.[3]).toBe('delivery.assigned');
    expect(inserts[0]?.[4]).toBe('Nouvelle collecte');
    expect(String(inserts[0]?.[5])).toContain('Mulikap → Eveider GOMBE');
    expect(String(inserts[0]?.[5])).toContain('1 colis à récupérer');
  });

  it('lists notifications for a courier', async () => {
    const ctx = createDataAccessContext('courier', { userId: 'courier-1' });

    setup((sql, values) => {
      if (sqlIncludes(sql, 'FROM notifications n')) {
        expect(values).toEqual(['courier-1']);
        return notificationRow({
          user_id: 'courier-1',
          type: 'delivery.assigned',
          title: 'Nouvelle collecte',
          message: 'Mulikap → Eveider GOMBE\n1 colis à récupérer',
          entity_type: 'delivery',
          entity_id: 'delivery-1',
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const items = await repo.listForCustomer(ctx);
    expect(items[0]?.message).toContain('Mulikap → Eveider GOMBE');
  });
});
