import { PRODUCT_LOCKS } from '@eveider/domain';
import { FeatureLocked } from '@/components/feature-locked';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPageContext } from '@/server/business';

export default async function LockedBusinessDriversLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  await requireBusinessPageContext();

  return (
    <FeatureLocked
      title="Chauffeurs"
      description={PRODUCT_LOCKS.orgDriverManage}
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Chauffeurs' },
      ]}
    />
  );
}
