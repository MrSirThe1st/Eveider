import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminParcelsLoading() {
  return (
    <PageFrame title="Colis" description="Suivi des colis du réseau Eveider." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
