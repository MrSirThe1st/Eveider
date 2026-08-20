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

  it('returns dashboard stats for admin in a single aggregate query', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'AS parcels_today') && sqlIncludes(sql, 'FROM compartments')) {
        return {
          parcels_today: 5,
          active_deliveries: 3,
          completed_today: 1,
          ready_for_pickup: 2,
          open_issues: 4,
          occupied: 8,
          available: 12,
          total: 22,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });
    const stats = await repo.getDashboard(ctx);

    expect(db.query).toHaveBeenCalledTimes(1);
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

  it('returns analytics report for admin without loading raw event rows', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'AS collected') && sqlIncludes(sql, 'AS awaiting')) {
        return {
          collected: 8,
          awaiting: 2,
          occupied: 5,
          total: 10,
        };
      }
      if (sqlIncludes(sql, 'AS daily_deliveries') && sqlIncludes(sql, 'AS top_businesses')) {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return {
          daily_deliveries: [{ date, count: 2 }],
          daily_parcels: [{ date, count: 3 }],
          parcels_by_status: [
            { status: 'created', count: 2 },
            { status: 'ready_for_pickup', count: 1 },
          ],
          open_issues_by_type: [{ type: 'failed_delivery', count: 1 }],
          top_lockers: [{ lockerId: 'locker-1', lockerName: 'GOMBE', parcelCount: 4 }],
          top_businesses: [{ businessId: 'biz-1', businessName: 'Shop', parcelCount: 10 }],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });
    const analytics = await repo.getAnalytics(ctx, 7);

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(analytics.pickupSuccessRate).toBe(80);
    expect(analytics.lockerUsageRate).toBe(50);
    expect(analytics.topLockers[0]?.lockerName).toBe('GOMBE');
    expect(analytics.topBusinesses[0]?.businessName).toBe('Shop');
    expect(analytics.dailyDeliveries).toHaveLength(7);
    expect(analytics.dailyParcelsCreated).toHaveLength(7);
    expect(analytics.parcelsByStatus).toEqual(
      expect.arrayContaining([
        { status: 'created', count: 2 },
        { status: 'ready_for_pickup', count: 1 },
      ]),
    );
    expect(analytics.openIssuesByType).toEqual(
      expect.arrayContaining([{ type: 'failed_delivery', count: 1 }]),
    );
  });

  it('returns public network stats without an admin context', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'AS kolwezi_lockers') && sqlIncludes(sql, 'AS parcels_handled')) {
        return { kolwezi_lockers: 2, lualaba_lockers: 3, parcels_handled: 41 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const stats = await repo.getPublicNetworkStats();

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(stats).toEqual({
      kolweziLockers: 2,
      lualabaLockers: 3,
      parcelsHandled: 41,
    });
  });

  it('returns business analytics scoped to the company', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'AS volume_this_month') && sqlIncludes(sql, 'AS top_lockers')) {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return {
          total: 40,
          delivered: 28,
          in_transit: 4,
          awaiting_pickup: 6,
          failed: 2,
          avg_seconds: 36000,
          volume_this_month: 12,
          volume_last_month: 10,
          daily_parcels: [{ date, count: 3 }],
          top_lockers: [{ lockerId: 'locker-1', lockerName: 'GOMBE', parcelCount: 9 }],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { userId: 'u1', businessId: 'biz-1' });
    const analytics = await repo.getBusinessAnalytics(ctx, 'biz-1');

    expect(analytics.total).toBe(40);
    expect(analytics.delivered).toBe(28);
    expect(analytics.pickupRate).toBe(82);
    expect(analytics.volumeChangePct).toBe(20);
    expect(analytics.returnRate).toBeNull();
    expect(analytics.dailyVolume).toHaveLength(30);
    expect(analytics.topLockers[0]?.lockerName).toBe('GOMBE');
  });

  it('denies business analytics outside company scope', async () => {
    setup(() => null);
    const ctx = createDataAccessContext('business', { userId: 'u1', businessId: 'biz-1' });
    await expect(repo.getBusinessAnalytics(ctx, 'biz-other')).rejects.toThrow('Business scope violation');
  });
});
