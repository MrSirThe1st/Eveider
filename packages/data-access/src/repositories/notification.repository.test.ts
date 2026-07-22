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
  });

  it('creates in-app notification on ready_for_pickup', async () => {
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
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'channel = \'in_app\'')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await repo.notifyParcelStatusChange('parcel-1', 'ready_for_pickup');

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toEqual([
      'user-1',
      'parcel-1',
      'Colis PK-001 — PRÊT POUR RETRAIT · GOMBE',
    ]);
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
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'channel = \'in_app\'')) {
        return { id: 'existing' };
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
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
            ...notificationRow({ message: 'Test' }),
            parcel_id_relation: 'parcel-1',
            parcel_reference: 'PK-001',
          },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const items = await repo.listForCustomer(ctx);

    expect(items).toHaveLength(1);
    expect(items[0]?.message).toBe('Test');
  });

  it('marks notification as read', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    const sentAt = new Date('2026-01-15T13:00:00.000Z');

    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM notifications')) {
        return notificationRow({ sent_at: null });
      }
      if (sqlIncludes(sql, 'UPDATE notifications SET sent_at')) {
        return notificationRow({ sent_at: sentAt });
      }
      if (sqlIncludes(sql, 'SELECT id, reference FROM parcels')) {
        return { id: 'parcel-1', reference: 'PK-001' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await repo.markRead(ctx, 'notif-1');
    expect(result.sentAt).toBeTruthy();
  });
});
