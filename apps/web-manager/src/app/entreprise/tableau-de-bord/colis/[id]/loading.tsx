import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessParcelDetailLoading() {
  return (
    <PageFrame title="Colis" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
