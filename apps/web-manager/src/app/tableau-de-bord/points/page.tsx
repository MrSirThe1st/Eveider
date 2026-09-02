import { PageFrame } from '@eveider/ui';
import { AdminLockerManager } from '@/components/admin-locker-manager';
import { LockerList } from '@/components/locker-list';
import { listLockers } from '@/server/lockers';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminPointsPage() {
  const { ctx } = await getAdminSession();
  const [lockers, serviceAreas] = await Promise.all([
    listLockers(ctx),
    listServiceAreaOptions(ctx),
  ]);

  return (
    <PageFrame
      title="Points"
      description="Tous les casiers et points de retrait."
      layout="wide"
    >
      <AdminLockerManager lockers={lockers} serviceAreas={serviceAreas} />
      <div style={{ marginTop: '2.5rem' }}>
        <LockerList lockers={lockers} serviceAreas={serviceAreas} />
      </div>
    </PageFrame>
  );
}
