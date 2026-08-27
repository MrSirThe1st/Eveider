import { getBusinessPermissions } from '@eveider/domain';
import { BusinessDashboardShell } from '@/components/business-dashboard-shell';
import { requireBusinessPageContext } from '@/server/business';

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireBusinessPageContext();

  return (
    <BusinessDashboardShell permissions={[...getBusinessPermissions(profile.userRole)]}>
      {children}
    </BusinessDashboardShell>
  );
}
