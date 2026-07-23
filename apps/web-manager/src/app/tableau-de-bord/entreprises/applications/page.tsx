import { PageFrame } from '@eveider/ui';
import { AdminBusinessApplications } from '@/components/admin-business-applications';
import { listBusinessApplications } from '@/server/business-applications';
import { getAdminSession } from '@/server/session';

export default async function BusinessApplicationsPage() {
  const { ctx } = await getAdminSession();
  const applications = await listBusinessApplications(ctx);

  return (
    <PageFrame
      title="Dossiers d'inscription Business"
      description="Revue KYC, contrôle des pièces justificatives et activation des comptes partenaires."
    >
      <AdminBusinessApplications applications={applications} />
    </PageFrame>
  );
}
