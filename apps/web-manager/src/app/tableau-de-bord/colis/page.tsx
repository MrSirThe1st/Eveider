import { PageFrame, TableSkeleton } from '@eveider/ui';
import { Suspense } from 'react';
import { AdminParcelList } from '@/components/admin-parcel-list';

export default function AdminParcelsPage() {
  return (
    <PageFrame
      title="Colis"
      description="Où se trouve chaque colis, et ce qui demande une action."
      layout="wide"
    >
      <Suspense fallback={<TableSkeleton />}>
        <AdminParcelList />
      </Suspense>
    </PageFrame>
  );
}
