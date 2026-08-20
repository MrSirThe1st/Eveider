import { assertAdmin, assertBusinessScope, type DataAccessContext } from '../context.js';
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

export type PublicNetworkStats = {
  kolweziLockers: number;
  lualabaLockers: number;
  parcelsHandled: number;
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

export type BusinessAnalytics = {
  total: number;
  delivered: number;
  inTransit: number;
  awaitingPickup: number;
  returned: number;
  failed: number;
  avgDeliverySeconds: number | null;
  volumeThisMonth: number;
  volumeLastMonth: number;
  volumeChangePct: number | null;
  pickupRate: number | null;
  returnRate: number | null;
  dailyVolume: DailyCount[];
  topLockers: RankedLocker[];
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

function serverTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function fillDailySeries(rows: { date: string; count: number }[], days: number): DailyCount[] {
  const start = startOfDaysAgo(days - 1);
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    counts.set(toDateKey(day), 0);
  }

  for (const row of rows) {
    if (counts.has(row.date)) {
      counts.set(row.date, row.count);
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

function asJsonArray<T>(value: unknown): T[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as T[]) : [];
}

export class StatsRepository {
  constructor(private readonly db: Queryable) {}

  async getDashboard(ctx: DataAccessContext): Promise<DashboardStats> {
    assertAdmin(ctx);

    const today = startOfToday();
    const result = await this.db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM parcels WHERE created_at >= $1) AS parcels_today,
         (SELECT COUNT(*)::int FROM deliveries WHERE status = ANY($2)) AS active_deliveries,
         (SELECT COUNT(*)::int FROM deliveries WHERE status = 'completed' AND completed_at >= $1) AS completed_today,
         (SELECT COUNT(*)::int FROM parcels WHERE status = 'ready_for_pickup') AS ready_for_pickup,
         (SELECT COUNT(*)::int FROM issues WHERE status = ANY($3)) AS open_issues,
         (SELECT COUNT(*)::int FROM compartments WHERE status = 'occupied') AS occupied,
         (SELECT COUNT(*)::int FROM compartments WHERE status = 'available') AS available,
         (SELECT COUNT(*)::int FROM compartments) AS total`,
      [today, ['assigned', 'scanned', 'drop_off_pending'], ['open', 'in_progress']],
    );

    const row = result.rows[0] ?? {};
    return {
      parcelsToday: Number(row.parcels_today ?? 0),
      activeDeliveries: Number(row.active_deliveries ?? 0),
      completedToday: Number(row.completed_today ?? 0),
      readyForPickup: Number(row.ready_for_pickup ?? 0),
      openIssues: Number(row.open_issues ?? 0),
      lockerOccupancy: {
        occupied: Number(row.occupied ?? 0),
        available: Number(row.available ?? 0),
        total: Number(row.total ?? 0),
      },
    };
  }

  async getAnalytics(ctx: DataAccessContext, days = 7): Promise<AnalyticsReport> {
    assertAdmin(ctx);

    const since = startOfDaysAgo(days - 1);
    const timeZone = serverTimeZone();

    const snapshotResult = await this.db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM parcels WHERE status = 'collected') AS collected,
         (SELECT COUNT(*)::int FROM parcels WHERE status = 'ready_for_pickup') AS awaiting,
         (SELECT COUNT(*)::int FROM compartments WHERE status = 'occupied') AS occupied,
         (SELECT COUNT(*)::int FROM compartments) AS total`,
    );

    const periodResult = await this.db.query(
      `SELECT
         (
           SELECT json_agg(json_build_object('date', day, 'count', count) ORDER BY day)
           FROM (
             SELECT to_char(date_trunc('day', completed_at AT TIME ZONE $2), 'YYYY-MM-DD') AS day,
                    COUNT(*)::int AS count
             FROM deliveries
             WHERE status = 'completed' AND completed_at >= $1
             GROUP BY 1
           ) daily_deliveries
         ) AS daily_deliveries,
         (
           SELECT json_agg(json_build_object('date', day, 'count', count) ORDER BY day)
           FROM (
             SELECT to_char(date_trunc('day', created_at AT TIME ZONE $2), 'YYYY-MM-DD') AS day,
                    COUNT(*)::int AS count
             FROM parcels
             WHERE created_at >= $1
             GROUP BY 1
           ) daily_parcels
         ) AS daily_parcels,
         (
           SELECT json_agg(json_build_object('status', status, 'count', count))
           FROM (
             SELECT status, COUNT(*)::int AS count
             FROM parcels
             WHERE created_at >= $1
             GROUP BY status
           ) parcel_status
         ) AS parcels_by_status,
         (
           SELECT json_agg(json_build_object('type', type, 'count', count))
           FROM (
             SELECT type, COUNT(*)::int AS count
             FROM issues
             WHERE status = ANY($3)
             GROUP BY type
           ) issue_types
         ) AS open_issues_by_type,
         (
           SELECT json_agg(json_build_object(
             'lockerId', locker_id,
             'lockerName', name,
             'parcelCount', count
           ))
           FROM (
             SELECT p.locker_id, l.name, COUNT(*)::int AS count
             FROM parcels p
             JOIN lockers l ON l.id = p.locker_id
             WHERE p.locker_id IS NOT NULL AND p.created_at >= $1
             GROUP BY p.locker_id, l.name
             ORDER BY count DESC
             LIMIT 5
           ) top_lockers
         ) AS top_lockers,
         (
           SELECT json_agg(json_build_object(
             'businessId', business_id,
             'businessName', name,
             'parcelCount', count
           ))
           FROM (
             SELECT p.business_id, b.name, COUNT(*)::int AS count
             FROM parcels p
             JOIN businesses b ON b.id = p.business_id
             GROUP BY p.business_id, b.name
             ORDER BY count DESC
             LIMIT 5
           ) top_businesses
         ) AS top_businesses`,
      [since, timeZone, ['open', 'in_progress']],
    );

    const snapshot = snapshotResult.rows[0] ?? {};
    const period = periodResult.rows[0] ?? {};
    const collected = Number(snapshot.collected ?? 0);
    const awaitingPickup = Number(snapshot.awaiting ?? 0);
    const occupied = Number(snapshot.occupied ?? 0);
    const total = Number(snapshot.total ?? 0);
    const pickupDenominator = collected + awaitingPickup;

    return {
      pickupSuccessRate: pickupDenominator > 0 ? Math.round((collected / pickupDenominator) * 100) : 0,
      lockerUsageRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      collected,
      awaitingPickup,
      dailyDeliveries: fillDailySeries(
        asJsonArray<{ date: string; count: number }>(period.daily_deliveries).map((row) => ({
          date: String(row.date),
          count: Number(row.count),
        })),
        days,
      ),
      dailyParcelsCreated: fillDailySeries(
        asJsonArray<{ date: string; count: number }>(period.daily_parcels).map((row) => ({
          date: String(row.date),
          count: Number(row.count),
        })),
        days,
      ),
      parcelsByStatus: mapParcelStatusCounts(
        asJsonArray<{ status: string; count: unknown }>(period.parcels_by_status),
      ),
      openIssuesByType: mapIssueTypeCounts(
        asJsonArray<{ type: string; count: unknown }>(period.open_issues_by_type),
      ),
      topLockers: asJsonArray<{ lockerId: string; lockerName: string; parcelCount: unknown }>(
        period.top_lockers,
      ).map((row) => ({
        lockerId: String(row.lockerId),
        lockerName: String(row.lockerName),
        parcelCount: Number(row.parcelCount),
      })),
      topBusinesses: asJsonArray<{
        businessId: string;
        businessName: string;
        parcelCount: unknown;
      }>(period.top_businesses).map((row) => ({
        businessId: String(row.businessId),
        businessName: String(row.businessName),
        parcelCount: Number(row.parcelCount),
      })),
    };
  }

  async getBusinessAnalytics(ctx: DataAccessContext, businessId: string): Promise<BusinessAnalytics> {
    assertBusinessScope(ctx, businessId);

    const since = startOfDaysAgo(29);
    const timeZone = serverTimeZone();
    const result = await this.db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM parcels WHERE business_id = $1) AS total,
         (SELECT COUNT(*)::int FROM parcels WHERE business_id = $1 AND status = 'collected') AS delivered,
         (SELECT COUNT(*)::int FROM parcels WHERE business_id = $1 AND status = 'in_transit') AS in_transit,
         (SELECT COUNT(*)::int FROM parcels WHERE business_id = $1 AND status IN ('delivered_to_locker', 'ready_for_pickup')) AS awaiting_pickup,
         (SELECT COUNT(DISTINCT p.id)::int
            FROM parcels p
            JOIN deliveries d ON d.parcel_id = p.id
           WHERE p.business_id = $1 AND d.status = 'failed') AS failed,
         (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
            FROM parcels
           WHERE business_id = $1 AND status = 'collected') AS avg_seconds,
         (SELECT COUNT(*)::int FROM parcels
           WHERE business_id = $1 AND created_at >= date_trunc('month', NOW())) AS volume_this_month,
         (SELECT COUNT(*)::int FROM parcels
           WHERE business_id = $1
             AND created_at >= date_trunc('month', NOW() - interval '1 month')
             AND created_at < date_trunc('month', NOW())) AS volume_last_month,
         (
           SELECT json_agg(json_build_object('date', day, 'count', count) ORDER BY day)
           FROM (
             SELECT to_char(date_trunc('day', created_at AT TIME ZONE $3), 'YYYY-MM-DD') AS day,
                    COUNT(*)::int AS count
             FROM parcels
             WHERE business_id = $1 AND created_at >= $2
             GROUP BY 1
           ) daily_parcels
         ) AS daily_parcels,
         (
           SELECT json_agg(json_build_object(
             'lockerId', locker_id,
             'lockerName', name,
             'parcelCount', count
           ))
           FROM (
             SELECT p.locker_id, l.name, COUNT(*)::int AS count
             FROM parcels p
             JOIN lockers l ON l.id = p.locker_id
             WHERE p.business_id = $1 AND p.locker_id IS NOT NULL
             GROUP BY p.locker_id, l.name
             ORDER BY count DESC
             LIMIT 5
           ) top_lockers
         ) AS top_lockers`,
      [businessId, since, timeZone],
    );

    const row = result.rows[0] ?? {};
    const delivered = Number(row.delivered ?? 0);
    const awaitingPickup = Number(row.awaiting_pickup ?? 0);
    const volumeThisMonth = Number(row.volume_this_month ?? 0);
    const volumeLastMonth = Number(row.volume_last_month ?? 0);
    const avgRaw = row.avg_seconds == null ? null : Number(row.avg_seconds);
    const pickupDenominator = delivered + awaitingPickup;

    return {
      total: Number(row.total ?? 0),
      delivered,
      inTransit: Number(row.in_transit ?? 0),
      awaitingPickup,
      returned: 0,
      failed: Number(row.failed ?? 0),
      avgDeliverySeconds: avgRaw != null && Number.isFinite(avgRaw) ? avgRaw : null,
      volumeThisMonth,
      volumeLastMonth,
      volumeChangePct:
        volumeLastMonth === 0 ? (volumeThisMonth > 0 ? 100 : null) : Math.round(((volumeThisMonth - volumeLastMonth) / volumeLastMonth) * 100),
      pickupRate: pickupDenominator > 0 ? Math.round((delivered / pickupDenominator) * 100) : null,
      returnRate: null,
      dailyVolume: fillDailySeries(
        asJsonArray<{ date: string; count: number }>(row.daily_parcels).map((entry) => ({
          date: String(entry.date),
          count: Number(entry.count),
        })),
        30,
      ),
      topLockers: asJsonArray<{ lockerId: string; lockerName: string; parcelCount: unknown }>(
        row.top_lockers,
      ).map((entry) => ({
        lockerId: String(entry.lockerId),
        lockerName: String(entry.lockerName),
        parcelCount: Number(entry.parcelCount),
      })),
    };
  }

  /** Public landing counters — aggregates only, no admin session. */
  async getPublicNetworkStats(): Promise<PublicNetworkStats> {
    const result = await this.db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM lockers
           WHERE archived_at IS NULL
             AND status = 'active'
             AND (name ILIKE '%kolwezi%' OR address ILIKE '%kolwezi%')) AS kolwezi_lockers,
         (SELECT COUNT(*)::int FROM lockers
           WHERE archived_at IS NULL
             AND status = 'active'
             AND (
               name ILIKE '%lualaba%' OR address ILIKE '%lualaba%'
               OR name ILIKE '%kolwezi%' OR address ILIKE '%kolwezi%'
               OR name ILIKE '%dilala%' OR address ILIKE '%dilala%'
               OR name ILIKE '%fungurume%' OR address ILIKE '%fungurume%'
             )) AS lualaba_lockers,
         (SELECT COUNT(*)::int FROM parcels) AS parcels_handled`,
    );

    const row = result.rows[0] ?? {};
    return {
      kolweziLockers: Number(row.kolwezi_lockers ?? 0),
      lualabaLockers: Number(row.lualaba_lockers ?? 0),
      parcelsHandled: Number(row.parcels_handled ?? 0),
    };
  }
}
