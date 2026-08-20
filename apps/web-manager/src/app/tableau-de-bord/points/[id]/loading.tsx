import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminPointDetailLoading() {
  return (
    <PageFrame title="Point" layout="standard">
      <CardListSkeleton cards={3} />
    </PageFrame>
  );
}
