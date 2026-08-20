import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminDeliveriesLoading() {
  return (
    <PageFrame title="Livraisons" description="Gestion des livraisons et des retraits." layout="fluid">
      <TableSkeleton rows={8} />
    </PageFrame>
  );
}
