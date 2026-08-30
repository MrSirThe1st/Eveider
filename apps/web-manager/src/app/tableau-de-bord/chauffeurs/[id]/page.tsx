import { notFound } from 'next/navigation';
import { BusinessDriverOverview } from '@/components/business-driver-overview';
import { loadAdminDriverDetail } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();

  return <BusinessDriverOverview driver={driver} showOrganization />;
}
