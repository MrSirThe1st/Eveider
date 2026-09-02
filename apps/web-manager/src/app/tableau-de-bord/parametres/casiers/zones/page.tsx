import { AdminServiceAreasPanel } from '@/components/admin-service-areas-panel';
import { listServiceAreas } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminServiceAreasPage() {
  const { ctx } = await getAdminSession();
  const areas = await listServiceAreas(ctx, { includeArchived: true });

  return <AdminServiceAreasPanel initialAreas={areas} />;
}
