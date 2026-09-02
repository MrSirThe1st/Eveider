import { notFound } from 'next/navigation';
import { BusinessDriverOverview } from '@/components/business-driver-overview';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessDriverDetail } from '@/server/drivers';
import { listServiceAreaOptions } from '@/server/service-areas';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessDriverOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const [driver, serviceAreas] = await Promise.all([
    loadBusinessDriverDetail(ctx.businessId!, id),
    listServiceAreaOptions(ctx),
  ]);
  if (!driver) notFound();

  return (
    <BusinessDriverOverview
      driver={driver}
      serviceAreas={serviceAreas}
      serviceAreaApiPath={`/api/organisation/drivers/${driver.id}`}
    />
  );
}
