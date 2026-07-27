import { PageFrame } from '@eveider/ui';
import { BusinessList } from '@/components/business-list';
import { listBusinesses } from '@/server/businesses';
import { getAdminSession } from '@/server/session';

export default async function AdminBusinessesPage() {
  const { ctx } = await getAdminSession();
  const businesses = await listBusinesses(ctx, { statuses: ['active'] });

  return (
    <PageFrame
      title="Entreprises actives"
      description="Répertoire des comptes partenaires vérifiés et actifs."
    >
      <BusinessList businesses={businesses} />
    </PageFrame>
  );
}
