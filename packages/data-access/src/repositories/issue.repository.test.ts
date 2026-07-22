import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  createSqlMatchMock,
  issueRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { IssueRepository } from './issue.repository.js';

describe('IssueRepository', () => {
  let db = createSqlMatchMock(() => null);
  let repo: IssueRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    repo = new IssueRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function issueWithRelations(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      ...issueRow(overrides),
      parcel_relation_id: 'parcel-1',
      parcel_reference: 'PK-001',
      locker_relation_id: 'locker-1',
      locker_name: 'GOMBE',
      reporter_relation_id: 'user-1',
      reporter_full_name: 'Jean',
      reporter_email: null,
      reporter_role: 'customer',
    };
  }

  it('creates issue for customer with parcel scope', async () => {
    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243800000000',
    });

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'customer_id')) {
        return {
          customer_id: 'user-1',
          recipient_phone: '+243800000000',
          locker_id: 'locker-1',
        };
      }
      if (sqlIncludes(sql, 'INSERT INTO issues')) {
        return { id: 'issue-1' };
      }
      if (sqlIncludes(sql, 'FROM issues i')) {
        return issueWithRelations();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const issue = await repo.create(ctx, {
      type: 'parcel_problem',
      parcelId: 'parcel-1',
      description: 'Colis endommagé',
    });

    expect(issue.id).toBe('issue-1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO issues'),
      expect.arrayContaining(['parcel_problem', 'Colis endommagé', 'parcel-1']),
    );
  });

  it('rejects courier issue without assigned delivery', async () => {
    const ctx = createDataAccessContext('courier', { userId: 'courier-1' });

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM deliveries')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.create(ctx, {
        type: 'failed_delivery',
        parcelId: 'parcel-1',
        description: 'Impossible de livrer',
      }),
    ).rejects.toThrow('Livraison non assignée');
  });

  it('updates status for admin', async () => {
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM issues')) {
        return issueRow({ status: 'open', parcel_id: null, locker_id: null });
      }
      if (sqlIncludes(sql, 'UPDATE issues SET status')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM issues i')) {
        return {
          ...issueWithRelations({
            status: 'in_progress',
            parcel_id: null,
            locker_id: null,
            description: 'Test',
          }),
          parcel_relation_id: null,
          parcel_reference: null,
          locker_relation_id: null,
          locker_name: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const issue = await repo.updateStatus(ctx, 'issue-1', 'in_progress');
    expect(issue.status).toBe('in_progress');
  });

  it('denies status update for customer', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    setup(() => null);

    await expect(repo.updateStatus(ctx, 'issue-1', 'resolved')).rejects.toThrow(
      'Admin role required',
    );
  });
});
