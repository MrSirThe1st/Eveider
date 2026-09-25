import { PageFrame, CardListSkeleton } from '@eveider/ui';

export default function BusinessPointsLoading() {
  return (
    <PageFrame
      title="Points"
      description="Explorez le réseau Eveider, comparez les tarifs depuis vos adresses et créez un colis vers un point."
      layout="wide"
    >
      <CardListSkeleton cards={1} />
    </PageFrame>
  );
}
