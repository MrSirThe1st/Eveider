import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function BusinessDriversLoading() {
  return (
    <PageFrame
      title="Chauffeurs"
      description="Vos chauffeurs et où ils en sont."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
