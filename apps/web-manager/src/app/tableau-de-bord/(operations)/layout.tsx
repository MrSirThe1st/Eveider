import { AdminLivraisonsChrome } from '@/components/admin-livraisons-chrome';

export default function AdminOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLivraisonsChrome>{children}</AdminLivraisonsChrome>;
}
