import { notFound } from 'next/navigation';
import { BusinessDriverDeliveries } from '@/components/business-driver-deliveries';
import { loadAdminDriverDeliveries, loadAdminDriverDetail } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverDeliveriesPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();
  const deliveries = await loadAdminDriverDeliveries(session.ctx, driver);

  return <BusinessDriverDeliveries deliveries={deliveries} showOrganization />;
}
