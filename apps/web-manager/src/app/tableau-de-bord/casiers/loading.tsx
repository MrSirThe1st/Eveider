import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminLockersLoading() {
  return (
    <PageFrame title="Casiers" layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
