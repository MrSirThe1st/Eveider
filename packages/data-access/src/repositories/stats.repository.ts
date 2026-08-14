import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { ISSUE_TYPES, PARCEL_STATUSES, type IssueType, type ParcelStatus } from '@eveider/domain';

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

export type DailyCount = {
  date: string;
  count: number;
};

/** @deprecated Use DailyCount */
export type DailyDeliveryCount = DailyCount;

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

export type ParcelStatusCount = {
  status: ParcelStatus;
  count: number;
};

export type IssueTypeCount = {
  type: IssueType;
  count: number;
};

export type AnalyticsReport = {
  pickupSuccessRate: number;
  lockerUsageRate: number;
  collected: number;
  awaitingPickup: number;
  dailyDeliveries: DailyCount[];
  dailyParcelsCreated: DailyCount[];
  parcelsByStatus: ParcelStatusCount[];
  openIssuesByType: IssueTypeCount[];
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
  timestamps: { at: Date | null }[],
  days: number,
  pickDate: (entry: { at: Date | null }) => Date | null = (entry) => entry.at,
): DailyCount[] {
  const start = startOfDaysAgo(days - 1);
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    counts.set(toDateKey(day), 0);
  }

  for (const entry of timestamps) {
    const at = pickDate(entry);
    if (!at) continue;
    const key = toDateKey(at);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

function mapParcelStatusCounts(rows: { status: string; count: unknown }[]): ParcelStatusCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(String(row.status), Number(row.count));
  }

  return PARCEL_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

function mapIssueTypeCounts(rows: { type: string; count: unknown }[]): IssueTypeCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(String(row.type), Number(row.count));
  }

  return ISSUE_TYPES.map((type) => ({
    type,
    count: counts.get(type) ?? 0,
  }));
}

export class StatsRepository {
  constructor(private readonly db: Queryable) {}

  async getDashboard(ctx: DataAccessContext): Promise<DashboardStats> {
    assertAdmin(ctx);

    const today = startOfToday();

    const [
      parcelsTodayResult, activeDeliveriesResult, completedTodayResult, readyForPickupResult,
      openIssuesResult, compartmentCountsResult,
    ] = await Promise.all([
      this.db.query(`SELECT COUNT(*)::int AS count FROM parcels WHERE created_at >= $1`, [today]),
      this.db.query(`SELECT COUNT(*)::int AS count FROM deliveries WHERE status = ANY($1)`, [['assigned', 'scanned', 'drop_off_pending']]),
      this.db.query(`SELECT COUNT(*)::int AS count FROM deliveries WHERE status = 'completed' AND completed_at >= $1`, [today]),
      this.db.query(`SELECT COUNT(*)::int AS count FROM parcels WHERE status = 'ready_for_pickup'`),
      this.db.query(`SELECT COUNT(*)::int AS count FROM issues WHERE status = ANY($1)`, [['open', 'in_progress']]),
      this.db.query(`SELECT status, COUNT(*)::int AS count FROM compartments GROUP BY status`),
    ]);
    const parcelsToday = Number(parcelsTodayResult.rows[0]?.count ?? 0);
    const activeDeliveries = Number(activeDeliveriesResult.rows[0]?.count ?? 0);
    const completedToday = Number(completedTodayResult.rows[0]?.count ?? 0);
    const readyForPickup = Number(readyForPickupResult.rows[0]?.count ?? 0);
    const openIssues = Number(openIssuesResult.rows[0]?.count ?? 0);

    let occupied = 0;
    let available = 0;
    let total = 0;

    for (const row of compartmentCountsResult.rows) {
      const count = Number(row.count);
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
      collectedResult,
      awaitingResult,
      compartmentCountsResult,
      completedResult,
      createdParcelsResult,
      parcelStatusResult,
      openIssuesByTypeResult,
      lockerGroupsResult,
      businessGroupsResult,
    ] = await Promise.all([
      this.db.query(`SELECT COUNT(*)::int AS count FROM parcels WHERE status = 'collected'`),
      this.db.query(`SELECT COUNT(*)::int AS count FROM parcels WHERE status = 'ready_for_pickup'`),
      this.db.query(`SELECT status, COUNT(*)::int AS count FROM compartments GROUP BY status`),
      this.db.query(`SELECT completed_at FROM deliveries WHERE status = 'completed' AND completed_at >= $1`, [since]),
      this.db.query(`SELECT created_at FROM parcels WHERE created_at >= $1`, [since]),
      this.db.query(
        `SELECT status, COUNT(*)::int AS count FROM parcels WHERE created_at >= $1 GROUP BY status`,
        [since],
      ),
      this.db.query(
        `SELECT type, COUNT(*)::int AS count FROM issues WHERE status = ANY($1) GROUP BY type`,
        [['open', 'in_progress']],
      ),
      this.db.query(
        `SELECT locker_id, COUNT(*)::int AS count FROM parcels WHERE locker_id IS NOT NULL AND created_at >= $1 GROUP BY locker_id ORDER BY count DESC LIMIT 5`,
        [since],
      ),
      this.db.query(`SELECT business_id, COUNT(*)::int AS count FROM parcels GROUP BY business_id ORDER BY count DESC LIMIT 5`),
    ]);
    const collected = Number(collectedResult.rows[0]?.count ?? 0);
    const awaitingPickup = Number(awaitingResult.rows[0]?.count ?? 0);
    const completedDeliveries = completedResult.rows.map((row) => ({
      at: row.completed_at == null ? null : new Date(String(row.completed_at)),
    }));
    const createdParcels = createdParcelsResult.rows.map((row) => ({
      at: row.created_at == null ? null : new Date(String(row.created_at)),
    }));
    const lockerGroups = lockerGroupsResult.rows;
    const businessGroups = businessGroupsResult.rows;

    let occupied = 0;
    let total = 0;
    for (const row of compartmentCountsResult.rows) {
      const count = Number(row.count);
      total += count;
      if (row.status === 'occupied') occupied = count;
    }

    const pickupDenominator = collected + awaitingPickup;
    const pickupSuccessRate =
      pickupDenominator > 0 ? Math.round((collected / pickupDenominator) * 100) : 0;
    const lockerUsageRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const lockerIds = lockerGroups.map((g) => String(g.locker_id));
    const businessIds = businessGroups.map((g) => String(g.business_id));

    const [lockers, businesses] = await Promise.all([
      lockerIds.length > 0 ? this.db.query(`SELECT id, name FROM lockers WHERE id = ANY($1)`, [lockerIds]) : Promise.resolve({ rows: [] }),
      businessIds.length > 0 ? this.db.query(`SELECT id, name FROM businesses WHERE id = ANY($1)`, [businessIds]) : Promise.resolve({ rows: [] }),
    ]);

    const lockerNames = new Map(lockers.rows.map((l) => [String(l.id), String(l.name)]));
    const businessNames = new Map(businesses.rows.map((b) => [String(b.id), String(b.name)]));

    return {
      pickupSuccessRate,
      lockerUsageRate,
      collected,
      awaitingPickup,
      dailyDeliveries: buildDailySeries(completedDeliveries, days),
      dailyParcelsCreated: buildDailySeries(createdParcels, days),
      parcelsByStatus: mapParcelStatusCounts(
        parcelStatusResult.rows as Array<{ status: string; count: unknown }>,
      ),
      openIssuesByType: mapIssueTypeCounts(
        openIssuesByTypeResult.rows as Array<{ type: string; count: unknown }>,
      ),
      topLockers: lockerGroups
        .map((g) => ({
          lockerId: String(g.locker_id),
          lockerName: lockerNames.get(String(g.locker_id)) ?? 'Casier',
          parcelCount: Number(g.count),
        })),
      topBusinesses: businessGroups.map((g) => ({
        businessId: String(g.business_id),
        businessName: businessNames.get(String(g.business_id)) ?? 'Entreprise',
        parcelCount: Number(g.count),
      })),
    };
  }
}
