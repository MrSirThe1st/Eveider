import { AdminServiceAreasPanel } from '@/components/admin-service-areas-panel';
import { listCities, listDrcCatalog } from '@/server/cities';
import { listLockers } from '@/server/lockers';
import { listServiceAreas } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminNetworkSettingsPage() {
  const { ctx } = await getAdminSession();
  const [cities, areas, lockers, catalog] = await Promise.all([
    listCities(ctx, { includeArchived: true }),
    listServiceAreas(ctx, { includeArchived: true }),
    listLockers(ctx),
    listDrcCatalog(),
  ]);

  return (
    <AdminServiceAreasPanel
      initialCities={cities}
      initialAreas={areas}
      lockers={lockers}
      catalog={catalog}
    />
  );
}
