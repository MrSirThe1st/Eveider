import { notFound } from 'next/navigation';
import { BusinessDriverDeliveries } from '@/components/business-driver-deliveries';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessDriverDeliveries, loadBusinessDriverDetail } from '@/server/drivers';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessDriverDeliveriesPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const driver = await loadBusinessDriverDetail(ctx.businessId!, id);
  if (!driver) notFound();
  const deliveries = await loadBusinessDriverDeliveries(ctx, driver);

  return <BusinessDriverDeliveries deliveries={deliveries} />;
}
