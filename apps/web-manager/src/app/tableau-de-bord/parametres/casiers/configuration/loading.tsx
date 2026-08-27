import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminLockerConfigurationLoading() {
  return (
    <PageFrame title="Casiers" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
