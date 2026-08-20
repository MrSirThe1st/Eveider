import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessBillingLoading() {
  return (
    <PageFrame title="Facturation" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
