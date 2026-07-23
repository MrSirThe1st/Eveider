import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { CreateParcelForm } from '@/components/create-parcel-form';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function NewParcelPage() {
  return (
    <PageFrame
      title="Nouveau colis"
      description="Enregistrez un colis pour livraison en casier."
      breadcrumbs={[
        { label: 'Mes colis', href: WEB_ROUTES.businessDashboard },
        { label: 'Nouveau' },
      ]}
      action={
        <Link href={WEB_ROUTES.businessDashboard} className="nb-btn nb-btn-secondary nb-btn--sm">
          Retour
        </Link>
      }
    >
      <CreateParcelForm />
    </PageFrame>
  );
}
