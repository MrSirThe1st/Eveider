import { PageFrame, TableSkeleton } from '@eveider/ui';
import { Suspense } from 'react';
import { AdminLiveDeliveryBoard } from '@/components/admin-live-delivery-board';

export default function AdminDeliveriesPage() {
  return (
    <PageFrame
      title="Livraisons"
      description="Livraisons en cours et retraits."
      layout="fluid"
    >
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <AdminLiveDeliveryBoard />
      </Suspense>
    </PageFrame>
  );
}
