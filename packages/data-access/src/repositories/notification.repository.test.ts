import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { NotificationRepository } from './notification.repository.js';

describe('NotificationRepository', () => {
  const parcelFindUnique = vi.fn();
  const userFindFirst = vi.fn();
  const notificationFindFirst = vi.fn();
  const notificationCreate = vi.fn();
  const notificationFindMany = vi.fn();
  const notificationCount = vi.fn();
  const notificationFindUniqueOrThrow = vi.fn();
  const notificationUpdate = vi.fn();

  const db = {
    parcel: { findUnique: parcelFindUnique },
    user: { findFirst: userFindFirst },
    notification: {
      findFirst: notificationFindFirst,
      create: notificationCreate,
      findMany: notificationFindMany,
      count: notificationCount,
      findUniqueOrThrow: notificationFindUniqueOrThrow,
      update: notificationUpdate,
    },
  };

  const repo = new NotificationRepository(db as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates in-app notification on ready_for_pickup', async () => {
    parcelFindUnique.mockResolvedValue({
      id: 'parcel-1',
      reference: 'PK-001',
      customerId: 'user-1',
      recipientPhone: '+243800000000',
      locker: { name: 'GOMBE' },
    });
    notificationFindFirst.mockResolvedValue(null);
    notificationCreate.mockResolvedValue({ id: 'notif-1' });

    await repo.notifyParcelStatusChange('parcel-1', 'ready_for_pickup');

    expect(notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        parcelId: 'parcel-1',
        channel: 'in_app',
        message: 'Colis PK-001 — PRÊT POUR RETRAIT · GOMBE',
      },
    });
  });

  it('skips duplicate notifications', async () => {
    parcelFindUnique.mockResolvedValue({
      id: 'parcel-1',
      reference: 'PK-001',
      customerId: 'user-1',
      recipientPhone: '+243800000000',
      locker: null,
    });
    notificationFindFirst.mockResolvedValue({ id: 'existing' });

    await repo.notifyParcelStatusChange('parcel-1', 'in_transit');

    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it('lists notifications for customer', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    notificationFindMany.mockResolvedValue([{ id: 'notif-1', message: 'Test' }]);

    const items = await repo.listForCustomer(ctx);

    expect(items).toHaveLength(1);
    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', channel: 'in_app' },
      }),
    );
  });

  it('marks notification as read', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    notificationFindUniqueOrThrow.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      sentAt: null,
    });
    notificationUpdate.mockResolvedValue({
      id: 'notif-1',
      sentAt: new Date(),
      parcel: null,
    });

    const result = await repo.markRead(ctx, 'notif-1');
    expect(result.sentAt).toBeTruthy();
  });
});
