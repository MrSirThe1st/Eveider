import { PageHeader } from '@eveider/ui';
import { AdminParcelDetail } from '@/components/admin-parcel-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminParcelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Détail colis" />
      <AdminParcelDetail parcelId={id} />
    </>
  );
}
