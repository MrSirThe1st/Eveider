import { PageFrame } from '@eveider/ui';
import { AdminDashboardView } from '@/components/admin-dashboard-view';
import { loadAdminDashboard } from '@/server/dashboard';
import { getAdminSession } from '@/server/session';

export default async function AdminDashboardPage() {
  const { ctx } = await getAdminSession();
  const data = await loadAdminDashboard(ctx);

  return (
    <PageFrame
      title="Vue d'ensemble"
      description="Indicateurs du jour, analytiques et suivi des colis en cours."
    >
      <AdminDashboardView data={data} />
    </PageFrame>
  );
}
