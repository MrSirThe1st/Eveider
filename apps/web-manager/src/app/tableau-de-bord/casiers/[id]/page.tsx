import { PageFrame } from '@eveider/ui';
import { LockerDetail } from '@/components/locker-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminLockerDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageFrame
      title="Casier"
      description="Localisation, compartiments et occupation."
      layout="wide"
      breadcrumbs={[
        { label: 'Casiers', href: '/tableau-de-bord/casiers' },
        { label: 'Détail' },
      ]}
    >
      <LockerDetail lockerId={id} />
    </PageFrame>
  );
}
