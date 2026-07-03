import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { StatsRepository } from './stats.repository.js';

describe('StatsRepository', () => {
  const parcelCount = vi.fn();
  const deliveryCount = vi.fn();
  const issueCount = vi.fn();
  const compartmentGroupBy = vi.fn();

  const db = {
    parcel: { count: parcelCount },
    delivery: { count: deliveryCount },
    issue: { count: issueCount },
    compartment: { groupBy: compartmentGroupBy },
  };

  const repo = new StatsRepository(db as never);

  beforeEach(() => {
    vi.clearAllMocks();
    parcelCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    deliveryCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    issueCount.mockResolvedValue(4);
    compartmentGroupBy.mockResolvedValue([
      { status: 'occupied', _count: { status: 8 } },
      { status: 'available', _count: { status: 12 } },
      { status: 'reserved', _count: { status: 2 } },
    ]);
  });

  it('returns dashboard stats for admin', async () => {
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
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });
    await expect(repo.getDashboard(ctx)).rejects.toThrow('Admin role required');
  });

  it('returns analytics report for admin', async () => {
    const parcelCount = vi.fn();
    const deliveryFindMany = vi.fn();
    const compartmentGroupBy = vi.fn();
    const parcelGroupBy = vi.fn();
    const lockerFindMany = vi.fn();
    const businessFindMany = vi.fn();

    const analyticsDb = {
      parcel: { count: parcelCount, groupBy: parcelGroupBy },
      delivery: { count: vi.fn(), findMany: deliveryFindMany },
      issue: { count: vi.fn() },
      compartment: { groupBy: compartmentGroupBy },
      locker: { findMany: lockerFindMany },
      business: { findMany: businessFindMany },
    };

    const analyticsRepo = new StatsRepository(analyticsDb as never);

    parcelCount.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    compartmentGroupBy.mockResolvedValue([
      { status: 'occupied', _count: { status: 5 } },
      { status: 'available', _count: { status: 5 } },
    ]);
    deliveryFindMany.mockResolvedValue([
      { completedAt: new Date() },
      { completedAt: new Date() },
    ]);
    parcelGroupBy
      .mockResolvedValueOnce([{ lockerId: 'locker-1', _count: { id: 4 } }])
      .mockResolvedValueOnce([{ businessId: 'biz-1', _count: { id: 10 } }]);
    lockerFindMany.mockResolvedValue([{ id: 'locker-1', name: 'GOMBE' }]);
    businessFindMany.mockResolvedValue([{ id: 'biz-1', name: 'Shop' }]);

    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });
    const analytics = await analyticsRepo.getAnalytics(ctx, 7);

    expect(analytics.pickupSuccessRate).toBe(80);
    expect(analytics.lockerUsageRate).toBe(50);
    expect(analytics.topLockers[0]?.lockerName).toBe('GOMBE');
    expect(analytics.topBusinesses[0]?.businessName).toBe('Shop');
    expect(analytics.dailyDeliveries).toHaveLength(7);
  });
});
