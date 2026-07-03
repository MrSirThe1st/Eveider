import { PageHeader } from '@eveider/ui';
import { AdminLockerManager } from '@/components/admin-locker-manager';
import { LockerList } from '@/components/locker-list';

export default function AdminLockersPage() {
  return (
    <>
      <PageHeader
        title="Gestion casiers"
        description="Carte du réseau, création de stations et suivi des compartiments."
      />
      <AdminLockerManager />
      <div style={{ marginTop: '2.5rem' }}>
        <LockerList />
      </div>
    </>
  );
}
