import { PageFrame } from '@eveider/ui';
import { BusinessParcelDetail } from '@/components/business-parcel-detail';
import { WEB_ROUTES } from '@/lib/auth-routing';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessParcelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageFrame
      title="Détail colis"
      description="Suivi et informations du colis."
      layout="standard"
      breadcrumbs={[
        { label: 'Colis', href: WEB_ROUTES.businessParcels },
        { label: 'Détail' },
      ]}
    >
      <BusinessParcelDetail parcelId={id} />
    </PageFrame>
  );
}
