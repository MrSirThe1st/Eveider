import { PageHeader } from '@eveider/ui';
import { LockerDetail } from '@/components/locker-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminLockerDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Casier"
        description="Grille physique, occupation et gestion des compartiments."
      />
      <LockerDetail lockerId={id} />
    </>
  );
}
