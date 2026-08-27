import { PageFrame } from '@eveider/ui';
import { BusinessLockerDirectory } from '@/components/business-locker-directory';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { listBusinessNetworkLockers } from '@/server/lockers';

export default async function BusinessLockersPage() {
  await requireBusinessPermission('view_parcels');
  const lockers = await listBusinessNetworkLockers();

  return (
    <PageFrame
      title="Points Eveider"
      description="Où envoyer vos colis : lieu, adresse, capacité, compartiments disponibles et statut."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Points' },
      ]}
    >
      <BusinessLockerDirectory lockers={lockers} />
    </PageFrame>
  );
}
