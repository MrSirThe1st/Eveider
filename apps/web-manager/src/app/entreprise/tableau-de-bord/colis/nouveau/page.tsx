import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { CreateParcelForm } from '@/components/create-parcel-form';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function NewParcelPage() {
  return (
    <PageFrame
      title="Créer un colis"
      description="Créez un colis Eveider avec suivi, QR et étiquette."
      layout="standard"
      breadcrumbs={[
        { label: 'Colis', href: WEB_ROUTES.businessParcels },
        { label: 'Nouveau colis' },
      ]}
      action={
        <Link href={WEB_ROUTES.businessParcels} className="nb-btn nb-btn-secondary nb-btn--sm">
          Retour
        </Link>
      }
    >
      <CreateParcelForm />
    </PageFrame>
  );
}
