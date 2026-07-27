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
      description="Dossiers en cours de vérification, corrections et comptes non actifs — hors entreprises déjà activées."
    >
      <AdminBusinessApplications applications={applications} />
    </PageFrame>
  );
}
