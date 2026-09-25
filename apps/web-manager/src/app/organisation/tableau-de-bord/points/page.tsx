import { PageFrame } from '@eveider/ui';
import { BusinessLockerDirectory } from '@/components/business-locker-directory';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessPointsPageData } from '@/server/lockers';

export default async function BusinessPointsPage() {
  const { profile } = await requireBusinessPermission('view_parcels');
  const { lockers, pickupLocations } = await loadBusinessPointsPageData(profile.businessId);

  return (
    <PageFrame
      title="Points"
      description="Explorez le réseau Eveider, comparez les tarifs depuis vos adresses et créez un colis vers un point."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Points' },
      ]}
    >
      <BusinessLockerDirectory lockers={lockers} pickupLocations={pickupLocations} />
    </PageFrame>
  );
}
