import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { PlatformStaffRepository } from './platform-staff.repository.js';

describe('PlatformStaffRepository former members', () => {
  const superAdmin = createDataAccessContext({
    userId: 'admin-1',
    platformRole: 'super_admin',
  });

  it('lists revoked staff who are not currently invited', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'former_platform_role IS NOT NULL')) {
        return {
          id: 'user-2',
          full_name: 'David Mwamba',
          email: 'admin.ops@eveider.cd',
          former_platform_role: 'admin',
          platform_access_revoked_at: new Date('2026-09-21T12:00:00.000Z'),
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const former = await new PlatformStaffRepository(db).listFormerStaff(superAdmin);
    expect(former).toEqual([
      {
        id: 'user-2',
        fullName: 'David Mwamba',
        email: 'admin.ops@eveider.cd',
        formerRole: 'admin',
        revokedAt: new Date('2026-09-21T12:00:00.000Z'),
      },
    ]);
  });

  it('stores the previous role when access is revoked', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM users', 'WHERE id = $1 LIMIT 1')) {
        return {
          id: 'user-2',
          auth_id: 'auth-2',
          platform_role: 'admin',
          is_customer: false,
          email: 'admin.ops@eveider.cd',
          phone: null,
          full_name: 'David Mwamba',
          is_blocked: false,
          deactivated_at: null,
          deleted_at: null,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-01T00:00:00.000Z'),
        };
      }
      if (sqlIncludes(sql, 'former_platform_role = $2')) {
        return {
          id: 'user-2',
          auth_id: 'auth-2',
          platform_role: null,
          is_customer: false,
          email: 'admin.ops@eveider.cd',
          phone: null,
          full_name: 'David Mwamba',
          is_blocked: false,
          deactivated_at: null,
          deleted_at: null,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-09-21T12:00:00.000Z'),
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const user = await new PlatformStaffRepository(db).revokeAccess(superAdmin, 'user-2');
    expect(user.platformRole).toBeNull();
    expect(user.id).toBe('user-2');
  });
});
