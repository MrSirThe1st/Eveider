import { PageHeader } from '@eveider/ui';
import { BusinessParcelDetail } from '@/components/business-parcel-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessParcelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Détail colis" />
      <BusinessParcelDetail parcelId={id} />
    </>
  );
}
