import { AdminShell } from '@/components/admin-shell';
import { requireWebRole } from '@/lib/require-web-role';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireWebRole(['admin']);

  return <AdminShell>{children}</AdminShell>;
}
