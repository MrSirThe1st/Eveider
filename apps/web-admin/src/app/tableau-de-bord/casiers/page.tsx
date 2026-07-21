import { PageHeader } from '@eveider/ui';
import { AdminLockerManager } from '@/components/admin-locker-manager';
import { LockerList } from '@/components/locker-list';
import { listLockers } from '@/server/lockers';
import { getAdminSession } from '@/server/session';

export default async function AdminLockersPage() {
  const { ctx } = await getAdminSession();
  const lockers = await listLockers(ctx);

  return (
    <>
      <PageHeader
        title="Gestion casiers"
        description="Carte du réseau, création de stations et suivi des compartiments."
      />
      <AdminLockerManager lockers={lockers} />
      <div style={{ marginTop: '2.5rem' }}>
        <LockerList lockers={lockers} />
      </div>
    </>
  );
}
