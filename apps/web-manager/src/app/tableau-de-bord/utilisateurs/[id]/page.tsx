import { PageFrame } from '@eveider/ui';
import { CourierProfileDetail } from '@/components/courier-profile-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourierDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageFrame
      title="Profil coursier"
      description="Identité, statut et historique des livraisons."
      breadcrumbs={[
        { label: 'Utilisateurs', href: '/tableau-de-bord/utilisateurs' },
        { label: 'Coursier' },
      ]}
    >
      <CourierProfileDetail courierId={id} />
    </PageFrame>
  );
}
