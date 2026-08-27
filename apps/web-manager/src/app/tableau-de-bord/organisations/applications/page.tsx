import { PageFrame } from '@eveider/ui';
import { AdminBusinessApplications } from '@/components/admin-business-applications';
import { AdminEntreprisesTabs } from '@/components/admin-module-tabs';
import { listBusinessApplications } from '@/server/business-applications';
import { getAdminSession } from '@/server/session';

export default async function BusinessApplicationsPage() {
  const { ctx } = await getAdminSession();
  const applications = await listBusinessApplications(ctx);

  return (
    <PageFrame
      title="Dossiers"
      description="Dossiers en cours de vérification, corrections et comptes non actifs."
      layout="wide"
    >
      <AdminEntreprisesTabs />
      <AdminBusinessApplications applications={applications} />
    </PageFrame>
  );
}
