import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminLockerTemplatesLoading() {
  return (
    <PageFrame title="Casiers" layout="standard">
      <CardListSkeleton cards={3} />
    </PageFrame>
  );
}
