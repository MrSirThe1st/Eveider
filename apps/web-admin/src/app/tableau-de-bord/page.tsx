import { PageHeader } from '@eveider/ui';
import { AdminDashboardContent } from '@/components/admin-dashboard-content';

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        description="Indicateurs du jour, analytiques et suivi des colis en cours."
      />
      <AdminDashboardContent />
    </>
  );
}
