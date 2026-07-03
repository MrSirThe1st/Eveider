import { Suspense } from 'react';
import { PageHeader } from '@eveider/ui';
import { BusinessParcelDetail } from '@/components/business-parcel-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ParcelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Détail colis" />
      <Suspense fallback={<p style={{ fontWeight: 500 }}>Chargement…</p>}>
        <BusinessParcelDetail parcelId={id} />
      </Suspense>
    </>
  );
}
