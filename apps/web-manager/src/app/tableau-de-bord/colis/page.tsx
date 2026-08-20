import { PageFrame } from '@eveider/ui';
import { AdminParcelList } from '@/components/admin-parcel-list';

export default function AdminParcelsPage() {
  return (
    <PageFrame
      title="Colis"
      description="Suivi des colis du réseau Eveider."
      layout="wide"
    >
      <AdminParcelList />
    </PageFrame>
  );
}
