import { AdminCasiersSettingsChrome } from '@/components/admin-casiers-settings-chrome';

export default function AdminCasiersSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminCasiersSettingsChrome>{children}</AdminCasiersSettingsChrome>;
}
