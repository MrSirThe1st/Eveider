import { PageFrame } from '@eveider/ui';
import { BusinessList } from '@/components/business-list';
import { listBusinesses } from '@/server/businesses';
import { getAdminSession } from '@/server/session';

export default async function AdminBusinessesPage() {
  const { ctx } = await getAdminSession();
  const businesses = await listBusinesses(ctx);

  return (
    <PageFrame
      title="Gestion entreprises"
      description="Validation et suivi des comptes partenaires."
    >
      <BusinessList businesses={businesses} />
    </PageFrame>
  );
}
