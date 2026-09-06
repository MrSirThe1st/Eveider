import { AdminBusinessApplications } from '@/components/admin-business-applications';
import { listAdminOrganizationVerificationQueue } from '@/server/organizations';
import { getAdminSession } from '@/server/session';

export default async function AdminOrganizationVerificationPage() {
  const { ctx } = await getAdminSession();
  const applications = await listAdminOrganizationVerificationQueue(ctx);

  return <AdminBusinessApplications applications={applications} />;
}
