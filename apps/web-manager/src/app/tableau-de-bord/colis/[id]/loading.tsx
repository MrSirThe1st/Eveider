import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminParcelDetailLoading() {
  return (
    <PageFrame title="Colis" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
