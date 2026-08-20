import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories, withDbQueryTrace } from '@eveider/data-access';
import type { AdminDashboardData, AnalyticsReport, DashboardStats } from '@/components/admin-dashboard-types';

function safeAnalyticsDays(days: number): number {
  return Number.isFinite(days) && days >= 1 && days <= 30 ? days : 7;
}

export async function loadAdminDashboardStats(ctx: DataAccessContext): Promise<DashboardStats> {
  const { stats } = createRepositories();
  return withDbQueryTrace('dashboard.kpis', () => stats.getDashboard(ctx));
}

export async function loadAdminAnalytics(
  ctx: DataAccessContext,
  days = 7,
): Promise<AnalyticsReport> {
  const { stats } = createRepositories();
  return withDbQueryTrace('dashboard.analytics', () =>
    stats.getAnalytics(ctx, safeAnalyticsDays(days)),
  );
}

/** Combined payload for API clients that still request both. Queries run sequentially. */
export async function loadAdminDashboard(
  ctx: DataAccessContext,
  days = 7,
): Promise<AdminDashboardData> {
  const { stats } = createRepositories();
  return withDbQueryTrace('dashboard.combined', async () => {
    const dashboardStats = await stats.getDashboard(ctx);
    const analytics = await stats.getAnalytics(ctx, safeAnalyticsDays(days));
    return { stats: dashboardStats, analytics };
  });
}
