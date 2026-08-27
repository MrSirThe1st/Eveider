import { describe, expect, it } from 'vitest';
import { AccessDeniedError, createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { TeamInviteRepository } from './team-invite.repository.js';

describe('TeamInviteRepository', () => {
  it('refuses to demote the last organization admin', async () => {
    const ctx = createDataAccessContext('business', {
      userId: 'admin-1',
      businessId: 'biz-1',
      businessUserRole: 'admin',
    });
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM users WHERE id')) {
        return {
          id: 'admin-1',
          auth_id: 'auth-1',
          platform_role: null,
          is_customer: false,
          email: 'admin@shop.cd',
          phone: null,
          full_name: 'Admin',
          is_blocked: false,
          created_at: new Date('2026-01-15T12:00:00.000Z'),
          updated_at: new Date('2026-01-15T12:00:00.000Z'),
        };
      }
      if (sqlIncludes(sql, 'FROM organization_memberships') && sqlIncludes(sql, 'user_id = $1 AND business_id')) {
        return {
          id: 'm-1',
          user_id: 'admin-1',
          business_id: 'biz-1',
          role: 'admin',
          created_at: new Date('2026-01-15T12:00:00.000Z'),
          updated_at: new Date('2026-01-15T12:00:00.000Z'),
        };
      }
      if (sqlIncludes(sql, "role IN ('account_owner', 'admin')")) {
        return { count: 0 };
      }
      return null;
    });
    const repo = new TeamInviteRepository(db);

    await expect(repo.updateMemberRole(ctx, 'admin-1', 'dispatcher')).rejects.toThrow(
      'L’organisation doit conserver au moins un administrateur',
    );
  });

  it('refuses a dispatcher inviting teammates', async () => {
    const ctx = createDataAccessContext('business', {
      userId: 'dispatcher-1',
      businessId: 'biz-1',
      businessUserRole: 'dispatcher',
    });
    const repo = new TeamInviteRepository(createSqlMatchMock(() => null));
    await expect(
      repo.invite(ctx, { email: 'new@shop.cd', role: 'dispatcher' }),
    ).rejects.toThrow(AccessDeniedError);
  });
});
