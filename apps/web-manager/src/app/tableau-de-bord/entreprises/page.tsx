import { PageFrame } from '@eveider/ui';
import { AdminEntreprisesTabs } from '@/components/admin-module-tabs';
import { BusinessList } from '@/components/business-list';
import { listBusinesses } from '@/server/businesses';
import { getAdminSession } from '@/server/session';

export default async function AdminBusinessesPage() {
  const { ctx } = await getAdminSession();
  const businesses = await listBusinesses(ctx, { statuses: ['active'] });

  return (
    <PageFrame
      title="Entreprises"
      description="Répertoire des comptes partenaires vérifiés et actifs."
      layout="wide"
    >
      <AdminEntreprisesTabs />
      <BusinessList businesses={businesses} />
    </PageFrame>
  );
}
