import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminApplicationsLoading() {
  return (
    <PageFrame
      title="Demandes"
      description="Demandes en attente de contrôle."
      layout="wide"
    >
      <CardListSkeleton />
    </PageFrame>
  );
}
