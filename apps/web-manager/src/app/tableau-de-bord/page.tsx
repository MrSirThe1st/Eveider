import { CardListSkeleton, PageFrame } from '@eveider/ui';
import { Suspense } from 'react';
import { AdminDashboardView } from '@/components/admin-dashboard-view';
import { AdminAnalyticsPanel } from '@/components/admin-analytics-panel';
import { loadAdminAnalytics, loadAdminDashboardStats } from '@/server/dashboard';
import { getAdminSession } from '@/server/session';

async function AdminDashboardAnalytics() {
  const { ctx } = await getAdminSession();
  const analytics = await loadAdminAnalytics(ctx, 7);
  return <AdminAnalyticsPanel analytics={analytics} days={7} />;
}

export default async function AdminDashboardPage() {
  const { ctx } = await getAdminSession();
  const stats = await loadAdminDashboardStats(ctx);

  return (
    <PageFrame
      title="Tableau de bord"
      description="Ce qui se passe aujourd’hui."
      layout="standard"
    >
      <AdminDashboardView stats={stats}>
        <Suspense fallback={<CardListSkeleton cards={1} />}>
          <AdminDashboardAnalytics />
        </Suspense>
      </AdminDashboardView>
    </PageFrame>
  );
}
