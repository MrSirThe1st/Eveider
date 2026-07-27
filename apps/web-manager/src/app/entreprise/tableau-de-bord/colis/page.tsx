import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { ParcelList } from '@/components/parcel-list';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessParcelsPage() {
  return (
    <PageFrame
      title="Mes colis"
      description="Suivez et gérez les colis de votre entreprise."
      breadcrumbs={[{ label: 'Mes colis' }]}
      action={
        <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary nb-btn--sm">
          Nouveau colis
        </Link>
      }
    >
      <ParcelList />
    </PageFrame>
  );
}
