import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { DriverDetailTabs } from '@/components/driver-detail-tabs';
import { WEB_ROUTES, businessDriverPath } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessDriverDetail } from '@/server/drivers';

type DriverLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function BusinessDriverDetailLayout({ children, params }: DriverLayoutProps) {
  const { id } = await params;
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const driver = await loadBusinessDriverDetail(ctx.businessId!, id);
  if (!driver) notFound();

  return (
    <PageFrame
      title={driver.fullName}
      description={driver.statusLabel}
      layout="wide"
      breadcrumbs={[
        { label: 'Chauffeurs', href: WEB_ROUTES.businessCouriers },
        { label: driver.fullName },
      ]}
    >
      <DriverDetailTabs basePath={businessDriverPath(driver.id)} />
      {children}
    </PageFrame>
  );
}
