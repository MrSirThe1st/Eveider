import { assertAdmin, type DataAccessContext } from '../context.js';
import type { PrismaClient } from '@prisma/client';

export type DashboardStats = {
  parcelsToday: number;
  activeDeliveries: number;
  completedToday: number;
  readyForPickup: number;
  openIssues: number;
  lockerOccupancy: {
    occupied: number;
    total: number;
    available: number;
  };
};

export type DailyDeliveryCount = {
  date: string;
  count: number;
};

export type RankedLocker = {
  lockerId: string;
  lockerName: string;
  parcelCount: number;
};

export type RankedBusiness = {
  businessId: string;
  businessName: string;
  parcelCount: number;
};

export type AnalyticsReport = {
  pickupSuccessRate: number;
  lockerUsageRate: number;
  collected: number;
  awaitingPickup: number;
  dailyDeliveries: DailyDeliveryCount[];
  topLockers: RankedLocker[];
  topBusinesses: RankedBusiness[];
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDaysAgo(days: number): Date {
  const start = startOfToday();
  start.setDate(start.getDate() - days);
  return start;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDailySeries(
  deliveries: { completedAt: Date | null }[],
  days: number,
): DailyDeliveryCount[] {
  const start = startOfDaysAgo(days - 1);
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    counts.set(toDateKey(day), 0);
  }

  for (const delivery of deliveries) {
    if (!delivery.completedAt) continue;
    const key = toDateKey(delivery.completedAt);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export class StatsRepository {
  constructor(private readonly db: PrismaClient) {}

  async getDashboard(ctx: DataAccessContext): Promise<DashboardStats> {
    assertAdmin(ctx);

    const today = startOfToday();

    const [
      parcelsToday,
      activeDeliveries,
      completedToday,
      readyForPickup,
      openIssues,
      compartmentCounts,
    ] = await Promise.all([
      this.db.parcel.count({ where: { createdAt: { gte: today } } }),
      this.db.delivery.count({
        where: { status: { in: ['assigned', 'scanned', 'drop_off_pending'] } },
      }),
      this.db.delivery.count({
        where: { status: 'completed', completedAt: { gte: today } },
      }),
      this.db.parcel.count({ where: { status: 'ready_for_pickup' } }),
      this.db.issue.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      this.db.compartment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    let occupied = 0;
    let available = 0;
    let total = 0;

    for (const row of compartmentCounts) {
      const count = row._count.status;
      total += count;
      if (row.status === 'occupied') occupied = count;
      if (row.status === 'available') available = count;
    }

    return {
      parcelsToday,
      activeDeliveries,
      completedToday,
      readyForPickup,
      openIssues,
      lockerOccupancy: { occupied, total, available },
    };
  }

  async getAnalytics(ctx: DataAccessContext, days = 7): Promise<AnalyticsReport> {
    assertAdmin(ctx);

    const since = startOfDaysAgo(days - 1);

    const [
      collected,
      awaitingPickup,
      compartmentCounts,
      completedDeliveries,
      lockerGroups,
      businessGroups,
    ] = await Promise.all([
      this.db.parcel.count({ where: { status: 'collected' } }),
      this.db.parcel.count({ where: { status: 'ready_for_pickup' } }),
      this.db.compartment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.db.delivery.findMany({
        where: { status: 'completed', completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      this.db.parcel.groupBy({
        by: ['lockerId'],
        where: {
          lockerId: { not: null },
          status: { in: ['delivered_to_locker', 'ready_for_pickup', 'collected'] },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.db.parcel.groupBy({
        by: ['businessId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    let occupied = 0;
    let total = 0;
    for (const row of compartmentCounts) {
      total += row._count.status;
      if (row.status === 'occupied') occupied = row._count.status;
    }

    const pickupDenominator = collected + awaitingPickup;
    const pickupSuccessRate =
      pickupDenominator > 0 ? Math.round((collected / pickupDenominator) * 100) : 0;
    const lockerUsageRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const lockerIds = lockerGroups
      .map((g) => g.lockerId)
      .filter((id): id is string => id !== null);
    const businessIds = businessGroups.map((g) => g.businessId);

    const [lockers, businesses] = await Promise.all([
      lockerIds.length > 0
        ? this.db.locker.findMany({
            where: { id: { in: lockerIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      businessIds.length > 0
        ? this.db.business.findMany({
            where: { id: { in: businessIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const lockerNames = new Map(lockers.map((l) => [l.id, l.name]));
    const businessNames = new Map(businesses.map((b) => [b.id, b.name]));

    return {
      pickupSuccessRate,
      lockerUsageRate,
      collected,
      awaitingPickup,
      dailyDeliveries: buildDailySeries(completedDeliveries, days),
      topLockers: lockerGroups
        .filter((g) => g.lockerId !== null)
        .map((g) => ({
          lockerId: g.lockerId!,
          lockerName: lockerNames.get(g.lockerId!) ?? 'Casier',
          parcelCount: g._count.id,
        })),
      topBusinesses: businessGroups.map((g) => ({
        businessId: g.businessId,
        businessName: businessNames.get(g.businessId) ?? 'Entreprise',
        parcelCount: g._count.id,
      })),
    };
  }
}
