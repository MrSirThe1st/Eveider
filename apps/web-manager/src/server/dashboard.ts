import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { AdminDashboardData } from '@/components/admin-dashboard-types';

export async function loadAdminDashboard(
  ctx: DataAccessContext,
  days = 7,
): Promise<AdminDashboardData> {
  const safeDays = Number.isFinite(days) && days >= 1 && days <= 30 ? days : 7;
  const { stats } = createRepositories();

  const [dashboardStats, analytics] = await Promise.all([
    stats.getDashboard(ctx),
    stats.getAnalytics(ctx, safeDays),
  ]);

  return {
    stats: dashboardStats,
    analytics,
  };
}
