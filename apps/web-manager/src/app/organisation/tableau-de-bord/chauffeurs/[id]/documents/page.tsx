import { notFound } from 'next/navigation';
import { BusinessDriverDocuments } from '@/components/business-driver-documents';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessDriverDetail } from '@/server/drivers';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessDriverDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const driver = await loadBusinessDriverDetail(ctx.businessId!, id);
  if (!driver) notFound();

  return <BusinessDriverDocuments driver={driver} />;
}
