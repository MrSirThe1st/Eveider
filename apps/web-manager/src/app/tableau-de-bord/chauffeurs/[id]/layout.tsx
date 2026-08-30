import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { DriverDetailTabs } from '@/components/driver-detail-tabs';
import { WEB_ROUTES, adminDriverPath } from '@/lib/auth-routing';
import { loadAdminDriverDetail } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type DriverLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function AdminDriverDetailLayout({ children, params }: DriverLayoutProps) {
  const { id } = await params;
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();

  return (
    <PageFrame
      title={driver.fullName}
      description={`${driver.statusLabel} · ${driver.organizationLabel}`}
      layout="wide"
      breadcrumbs={[
        { label: 'Chauffeurs', href: WEB_ROUTES.adminDrivers },
        { label: driver.fullName },
      ]}
    >
      <DriverDetailTabs basePath={adminDriverPath(driver.id)} />
      {children}
    </PageFrame>
  );
}
