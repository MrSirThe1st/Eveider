import { PageFrame } from '@eveider/ui';
import { Suspense } from 'react';
import { AdminLiveDeliveryBoard } from '@/components/admin-live-delivery-board';

export default function AdminDeliveriesPage() {
  return (
    <PageFrame
      title="Suivi des livraisons"
      description="Livraisons actives en temps réel — assignation, scan et dépôt au casier."
    >
      <Suspense fallback={<p style={{ fontWeight: 500 }}>Chargement…</p>}>
        <AdminLiveDeliveryBoard />
      </Suspense>
    </PageFrame>
  );
}
