import { PageFrame } from '@eveider/ui';
import { LockerDetail } from '@/components/locker-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPointDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageFrame
      title="Point Eveider"
      description="Détail, capacité et gestion du point de retrait."
      breadcrumbs={[
        { label: 'Points', href: '/tableau-de-bord/points' },
        { label: 'Détail' },
      ]}
    >
      <LockerDetail lockerId={id} />
    </PageFrame>
  );
}
