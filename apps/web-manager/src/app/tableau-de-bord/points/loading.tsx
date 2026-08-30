import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminPointsLoading() {
  return (
    <PageFrame
      title="Points"
      description="Tous les casiers et points de retrait."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
