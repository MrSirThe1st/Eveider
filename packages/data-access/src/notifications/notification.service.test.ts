import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { NotificationService } from '../notifications/notification.service.js';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one in-app row per recipient and skips duplicates', async () => {
    const inserts: unknown[][] = [];
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'FROM users u') && sqlIncludes(sql, "platform_role IN ('super_admin', 'admin')")) {
        return [
          {
            id: 'admin-1',
            email: 'a@eveider.com',
            full_name: 'Admin',
            email_notifications_enabled: false,
          },
        ];
      }
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, 'dedupe_key')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return { id: 'n1' };
      }
      return null;
    });

    const service = new NotificationService(db);
    await service.emit({
      type: 'org.verification_pending',
      audience: 'platform_admins',
      title: 'Vérification organisation',
      message: 'Boutique attend une revue.',
      entityType: 'business',
      entityId: 'biz-1',
      businessId: 'biz-1',
      dedupeKey: 'org.verification_pending:ver-1',
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.[3]).toBe('org.verification_pending');
  });

  it('counts unread with read_at IS NULL', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'read_at IS NULL')) {
        return { count: 3 };
      }
      return null;
    });
    const service = new NotificationService(db);
    await expect(service.unreadCount('user-1')).resolves.toBe(3);
  });
});
