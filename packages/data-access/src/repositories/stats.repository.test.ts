import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { StatsRepository } from './stats.repository.js';

describe('StatsRepository', () => {
  let db = createSqlMatchMock(() => null);
  let repo: StatsRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    repo = new StatsRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard stats for admin', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'created_at >=')) {
        return { count: 5 };
      }
      if (
        sqlIncludes(sql, 'FROM deliveries') &&
        sqlIncludes(sql, 'status = ANY') &&
        !sqlIncludes(sql, 'completed')
      ) {
        return { count: 3 };
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, "status = 'completed'")) {
        return { count: 1 };
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, "status = 'ready_for_pickup'")) {
        return { count: 2 };
      }
      if (sqlIncludes(sql, 'FROM issues')) {
        return { count: 4 };
      }
      if (sqlIncludes(sql, 'FROM compartments') && sqlIncludes(sql, 'GROUP BY status')) {
        return [
          { status: 'occupied', count: 8 },
          { status: 'available', count: 12 },
          { status: 'reserved', count: 2 },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });
    const stats = await repo.getDashboard(ctx);

    expect(stats.parcelsToday).toBe(5);
    expect(stats.activeDeliveries).toBe(3);
    expect(stats.completedToday).toBe(1);
    expect(stats.readyForPickup).toBe(2);
    expect(stats.openIssues).toBe(4);
    expect(stats.lockerOccupancy).toEqual({ occupied: 8, available: 12, total: 22 });
  });

  it('denies non-admin', async () => {
    setup(() => null);
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    await expect(repo.getDashboard(ctx)).rejects.toThrow('Admin role required');
  });

  it('returns analytics report for admin', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, "status = 'collected'")) {
        return { count: 8 };
      }
      if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, "status = 'ready_for_pickup'")) {
        return { count: 2 };
      }
      if (sqlIncludes(sql, 'FROM compartments') && sqlIncludes(sql, 'GROUP BY status')) {
        return [
          { status: 'occupied', count: 5 },
          { status: 'available', count: 5 },
        ];
      }
      if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'completed_at')) {
        return [{ completed_at: new Date() }, { completed_at: new Date() }];
      }
      if (sqlIncludes(sql, 'GROUP BY locker_id')) {
        return [{ locker_id: 'locker-1', count: 4 }];
      }
      if (sqlIncludes(sql, 'GROUP BY business_id')) {
        return [{ business_id: 'biz-1', count: 10 }];
      }
      if (sqlIncludes(sql, 'FROM lockers')) {
        return [{ id: 'locker-1', name: 'GOMBE' }];
      }
      if (sqlIncludes(sql, 'FROM businesses')) {
        return [{ id: 'biz-1', name: 'Shop' }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });
    const analytics = await repo.getAnalytics(ctx, 7);

    expect(analytics.pickupSuccessRate).toBe(80);
    expect(analytics.lockerUsageRate).toBe(50);
    expect(analytics.topLockers[0]?.lockerName).toBe('GOMBE');
    expect(analytics.topBusinesses[0]?.businessName).toBe('Shop');
    expect(analytics.dailyDeliveries).toHaveLength(7);
  });
});
