import { BusinessDashboardShell } from '@/components/business-dashboard-shell';
import { requireWebRole } from '@/lib/require-web-role';

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWebRole(['business']);

  return <BusinessDashboardShell>{children}</BusinessDashboardShell>;
}
