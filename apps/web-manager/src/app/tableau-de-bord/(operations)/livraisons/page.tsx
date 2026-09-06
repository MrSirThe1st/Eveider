import { Suspense } from 'react';
import { TableSkeleton } from '@eveider/ui';
import { AdminLiveDeliveryBoard } from '@/components/admin-live-delivery-board';

export default function AdminDeliveriesPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AdminLiveDeliveryBoard />
    </Suspense>
  );
}
