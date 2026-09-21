import { AdminFleetView } from '@/components/admin-fleet-view';
import { loadAdminDriverRoster } from '@/server/drivers';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

type PageProps = {
  searchParams: Promise<{ ajouter?: string }>;
};

export default async function AdminDriversPage({ searchParams }: PageProps) {
  const session = await getAdminSession();
  const params = await searchParams;
  const [drivers, serviceAreas] = await Promise.all([
    loadAdminDriverRoster(session.ctx),
    listServiceAreaOptions(session.ctx),
  ]);

  return (
    <AdminFleetView
      drivers={drivers}
      serviceAreas={serviceAreas}
      initialAddOpen={params.ajouter === '1'}
    />
  );
}
