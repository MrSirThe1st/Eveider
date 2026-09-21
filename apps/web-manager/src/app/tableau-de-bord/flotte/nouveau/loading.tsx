import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminNewDriverLoading() {
  return (
    <PageFrame title="Flotte" description="Chauffeurs Eveider." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
