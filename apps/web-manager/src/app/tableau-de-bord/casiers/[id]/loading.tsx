import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminLockerDetailLoading() {
  return (
    <PageFrame title="Casier" layout="wide">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
