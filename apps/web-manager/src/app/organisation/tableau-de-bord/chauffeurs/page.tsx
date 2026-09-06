import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { BusinessDriverList } from '@/components/business-driver-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessDriverRoster } from '@/server/drivers';

export default async function BusinessDriversPage() {
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const drivers = await loadBusinessDriverRoster(ctx);

  return (
    <PageFrame
      title="Chauffeurs"
      description="Vos chauffeurs et où ils en sont."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Chauffeurs' },
      ]}
      action={
        <Link
          href={WEB_ROUTES.businessNewDriver}
          className="nb-btn nb-btn-primary nb-btn--sm"
          data-testid="business-drivers-header-add"
        >
          Ajouter un chauffeur
        </Link>
      }
    >
      <BusinessDriverList drivers={drivers} />
    </PageFrame>
  );
}
