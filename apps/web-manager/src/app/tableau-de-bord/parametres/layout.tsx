/**
 * Settings chrome (secondary sidebar) lives in AdminShell via AdminSettingsChrome
 * so it appears immediately on navigation.
 */
export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
