import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminDeliveriesLoading() {
  return (
    <PageFrame title="Livraisons" description="Livraisons en cours et retraits." layout="fluid">
      <TableSkeleton rows={8} />
    </PageFrame>
  );
}
