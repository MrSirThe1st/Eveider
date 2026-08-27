import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessSettingsLoading() {
  return (
    <PageFrame title="Paramètres" layout="standard">
      <CardListSkeleton cards={3} />
    </PageFrame>
  );
}
