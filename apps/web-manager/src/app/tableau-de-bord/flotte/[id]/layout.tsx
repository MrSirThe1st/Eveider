import { PageHeader } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DriverDetailTabs } from '@/components/driver-detail-tabs';
import { WEB_ROUTES, adminDriverPath } from '@/lib/auth-routing';
import { loadAdminDriverDetail } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

type DriverLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const FLOTTE_CRUMB = { label: 'Flotte', href: WEB_ROUTES.adminDrivers };

async function DriverDetailHeader({ id }: { id: string }) {
  const session = await getAdminSession();
  const driver = await loadAdminDriverDetail(session.ctx, id);
  if (!driver) notFound();

  return (
    <PageHeader
      title={driver.fullName}
      description={`${driver.statusLabel} · ${driver.organizationLabel}`}
      breadcrumbs={[FLOTTE_CRUMB, { label: driver.fullName }]}
    />
  );
}

export default async function AdminDriverDetailLayout({ children, params }: DriverLayoutProps) {
  const { id } = await params;

  return (
    <div className="page-frame page-frame--wide">
      <Suspense
        fallback={<PageHeader title="Chauffeur" breadcrumbs={[FLOTTE_CRUMB, { label: 'Dossier' }]} />}
      >
        <DriverDetailHeader id={id} />
      </Suspense>
      <div className="page-frame__content">
        <DriverDetailTabs basePath={adminDriverPath(id)} />
        {children}
      </div>
    </div>
  );
}
