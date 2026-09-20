import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminPointDetailLoading() {
  return (
    <PageFrame title="Casier" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
