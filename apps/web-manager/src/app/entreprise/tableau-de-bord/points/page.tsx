import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { BusinessLockerDirectory } from '@/components/business-locker-directory';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPageContext } from '@/server/business';
import { listBusinessNetworkLockers } from '@/server/lockers';

export default async function BusinessLockersPage() {
  await requireBusinessPageContext();
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
      action={
        <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary nb-btn--sm">
          Nouveau colis
        </Link>
      }
    >
      <BusinessLockerDirectory lockers={lockers} />
    </PageFrame>
  );
}
