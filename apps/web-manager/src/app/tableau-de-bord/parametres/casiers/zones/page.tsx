import { AdminServiceAreasPanel } from '@/components/admin-service-areas-panel';
import { listCities } from '@/server/cities';
import { listLockers } from '@/server/lockers';
import { listServiceAreas } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminServiceAreasPage() {
  const { ctx } = await getAdminSession();
  const [cities, areas, lockers] = await Promise.all([
    listCities(ctx, { includeArchived: true }),
    listServiceAreas(ctx, { includeArchived: true }),
    listLockers(ctx),
  ]);

  return (
    <AdminServiceAreasPanel initialCities={cities} initialAreas={areas} lockers={lockers} />
  );
}
