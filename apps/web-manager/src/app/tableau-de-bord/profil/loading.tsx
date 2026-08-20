import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminProfileLoading() {
  return (
    <PageFrame title="Mon profil" layout="standard">
      <CardListSkeleton cards={1} />
    </PageFrame>
  );
}
