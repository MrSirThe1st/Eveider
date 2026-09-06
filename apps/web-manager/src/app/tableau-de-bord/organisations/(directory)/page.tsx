import { AdminOrganizationList } from '@/components/admin-organization-list';
import { listAdminOrganizations } from '@/server/organizations';
import { getAdminSession } from '@/server/session';

export default async function AdminOrganizationsPage() {
  const { ctx } = await getAdminSession();
  const organizations = await listAdminOrganizations(ctx);

  return <AdminOrganizationList organizations={organizations} />;
}
