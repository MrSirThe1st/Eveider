import { notFound } from 'next/navigation';
import { AdminDriverDocuments } from '@/components/admin-driver-documents';
import { loadAdminDriverDetail, loadAdminDriverVehicleDocuments } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();
  const vehicleDocuments = await loadAdminDriverVehicleDocuments(session.ctx, id);

  return <AdminDriverDocuments driver={driver} vehicleDocuments={vehicleDocuments} />;
}
