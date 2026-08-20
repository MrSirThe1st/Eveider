import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminApplicationsLoading() {
  return (
    <PageFrame
      title="Dossiers"
      description="Dossiers en cours de vérification, corrections et comptes non actifs."
      layout="wide"
    >
      <CardListSkeleton />
    </PageFrame>
  );
}
