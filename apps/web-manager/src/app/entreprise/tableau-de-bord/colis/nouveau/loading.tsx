import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessNewParcelLoading() {
  return (
    <PageFrame title="Nouveau colis" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
