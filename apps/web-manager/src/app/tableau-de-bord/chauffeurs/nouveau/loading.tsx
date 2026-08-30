import { PageFrame, CardListSkeleton } from '@eveider/ui';

export default function AdminNewDriverLoading() {
  return (
    <PageFrame title="Ajouter un chauffeur" layout="standard">
      <CardListSkeleton cards={1} />
    </PageFrame>
  );
}
