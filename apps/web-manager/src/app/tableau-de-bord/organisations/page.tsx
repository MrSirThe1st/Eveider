import { PageFrame } from '@eveider/ui';
import { AdminOrganisationsTabs } from '@/components/admin-module-tabs';
import { AdminOrganizationList } from '@/components/admin-organization-list';
import { listAdminOrganizations } from '@/server/organizations';
import { getAdminSession } from '@/server/session';

export default async function AdminOrganizationsPage() {
  const { ctx } = await getAdminSession();
  const organizations = await listAdminOrganizations(ctx);

  return (
    <PageFrame
      title="Organisations"
      description="Annuaire des organisations Eveider. Le statut de compte et la vérification sont indépendants."
      layout="wide"
    >
      <AdminOrganisationsTabs />
      <AdminOrganizationList organizations={organizations} />
    </PageFrame>
  );
}
