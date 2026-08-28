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
      description="Dossiers KYC soumis pour revue ou en attente de correction. L’accès opérationnel des organisations est indépendant de cette liste."
      layout="wide"
    >
      <AdminEntreprisesTabs />
      <AdminBusinessApplications applications={applications} />
    </PageFrame>
  );
}
