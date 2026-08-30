import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminApplicationDetailLoading() {
  return (
    <PageFrame title="Demande" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
