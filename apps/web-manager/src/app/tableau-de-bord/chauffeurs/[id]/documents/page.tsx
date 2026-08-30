import { notFound } from 'next/navigation';
import { AdminDriverDocuments } from '@/components/admin-driver-documents';
import { loadAdminDriverDetail } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();

  return <AdminDriverDocuments driver={driver} />;
}
