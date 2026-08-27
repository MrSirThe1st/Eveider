import { CardListSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessTeamLoading() {
  return (
    <PageFrame title="Équipe" layout="wide">
      <CardListSkeleton cards={2} />
    </PageFrame>
  );
}
