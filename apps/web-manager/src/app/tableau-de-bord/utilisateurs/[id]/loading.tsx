import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function AdminUserDetailLoading() {
  return (
    <PageFrame title="Utilisateur" layout="standard">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
