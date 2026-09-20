import { notFound } from 'next/navigation';
import { BusinessDriverOverview } from '@/components/business-driver-overview';
import { loadAdminDriverDetail } from '@/server/drivers';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const [driver, serviceAreas] = await Promise.all([
    loadAdminDriverDetail(session.ctx, id),
    listServiceAreaOptions(session.ctx),
  ]);
  if (!driver) notFound();

  return (
    <BusinessDriverOverview
      driver={driver}
      showOrganization
      serviceAreas={serviceAreas}
      serviceAreaApiPath={`/api/admin/driver-dossiers/${driver.id}`}
    />
  );
}
