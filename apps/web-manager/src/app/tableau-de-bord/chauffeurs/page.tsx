import { PageFrame } from '@eveider/ui';
import { AdminCourierPanel } from '@/components/admin-courier-panel';
import { loadAdminCourierDossiers } from '@/server/couriers';
import { getAdminSession } from '@/server/session';

export default async function AdminCouriersPage() {
  await getAdminSession();
  const dossiers = await loadAdminCourierDossiers();

  return (
    <PageFrame
      title="Coursiers"
      description="Revue des dossiers, invitation mobile, et réactivation. Bloquer un compte reste une action séparée."
      layout="wide"
      breadcrumbs={[{ label: 'Coursiers' }]}
    >
      <AdminCourierPanel dossiers={dossiers} />
    </PageFrame>
  );
}
