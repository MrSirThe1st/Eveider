import { PageFrame } from '@eveider/ui';
import { AdminBusinessApplications } from '@/components/admin-business-applications';
import { AdminOrganisationsTabs } from '@/components/admin-module-tabs';
import { listAdminOrganizationVerificationQueue } from '@/server/organizations';
import { getAdminSession } from '@/server/session';

export default async function AdminOrganizationVerificationPage() {
  const { ctx } = await getAdminSession();
  const applications = await listAdminOrganizationVerificationQueue(ctx);

  return (
    <PageFrame
      title="Vérification"
      description="Organisations ayant soumis un dossier en attente de revue Eveider."
      layout="wide"
    >
      <AdminOrganisationsTabs />
      <AdminBusinessApplications applications={applications} />
    </PageFrame>
  );
}
