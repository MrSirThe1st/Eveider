import { PageFrame } from '@eveider/ui';
import { AdminParcelList } from '@/components/admin-parcel-list';

export default function AdminParcelsPage() {
  return (
    <PageFrame
      title="Colis"
      description="Tous les colis du réseau Eveider."
    >
      <AdminParcelList />
    </PageFrame>
  );
}
