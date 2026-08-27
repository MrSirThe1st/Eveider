import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { CreateParcelForm } from '@/components/create-parcel-form';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';

type NewParcelPageProps = {
  searchParams: Promise<{ lockerId?: string }>;
};

export default async function NewParcelPage({ searchParams }: NewParcelPageProps) {
  await requireBusinessPermission('create_parcels');
  const { lockerId } = await searchParams;

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
      <CreateParcelForm initialLockerId={lockerId} />
    </PageFrame>
  );
}
