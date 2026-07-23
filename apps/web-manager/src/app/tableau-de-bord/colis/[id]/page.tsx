import { PageFrame } from '@eveider/ui';
import { AdminParcelDetail } from '@/components/admin-parcel-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminParcelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageFrame
      title="Détail colis"
      description="Statut, destinataire et historique de l'envoi."
      breadcrumbs={[
        { label: "Vue d'ensemble", href: '/tableau-de-bord' },
        { label: 'Colis' },
      ]}
    >
      <AdminParcelDetail parcelId={id} />
    </PageFrame>
  );
}
