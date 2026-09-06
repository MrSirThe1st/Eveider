import { AdminOrganisationsChrome } from '@/components/admin-organisations-chrome';

export default function AdminOrganisationsDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminOrganisationsChrome>{children}</AdminOrganisationsChrome>;
}
