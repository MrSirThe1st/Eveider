import { PageFrame } from '@eveider/ui';
import { AdminLockerManager } from '@/components/admin-locker-manager';
import { LockerList } from '@/components/locker-list';
import { listLockers } from '@/server/lockers';
import { getAdminSession } from '@/server/session';

export default async function AdminPointsPage() {
  const { ctx } = await getAdminSession();
  const lockers = await listLockers(ctx);

  return (
    <PageFrame
      title="Points Eveider"
      description="Casiers intelligents, points partenaires et points résidentiels."
    >
      <AdminLockerManager lockers={lockers} />
      <div style={{ marginTop: '2.5rem' }}>
        <LockerList lockers={lockers} />
      </div>
    </PageFrame>
  );
}
