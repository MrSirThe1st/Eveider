import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { AdminDashboardData } from '@/components/admin-dashboard-types';
import { toAdminParcelDto } from '@/lib/parcel-presenter';

const DASHBOARD_PARCEL_LIMIT = 20;

export async function loadAdminDashboard(
  ctx: DataAccessContext,
  days = 7,
): Promise<AdminDashboardData> {
  const safeDays = Number.isFinite(days) && days >= 1 && days <= 30 ? days : 7;
  const { stats, parcels } = createRepositories();

  const [dashboardStats, analytics, parcelItems] = await Promise.all([
    stats.getDashboard(ctx),
    stats.getAnalytics(ctx, safeDays),
    parcels.listRecent(ctx, { take: DASHBOARD_PARCEL_LIMIT }),
  ]);

  return {
    stats: dashboardStats,
    analytics,
    parcels: parcelItems.map(toAdminParcelDto),
  };
}
