import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function OrganizationVerificationLoading() {
  return (
    <PageFrame title="Vérification" layout="standard">
      <CardListSkeleton cards={3} />
    </PageFrame>
  );
}
