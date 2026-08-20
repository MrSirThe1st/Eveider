import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminPricingLoading() {
  return (
    <PageFrame title="Tarifs livraison" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
