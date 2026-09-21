import { PageHeader } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OrganizationDetailTabs } from '@/components/organization-detail-tabs';
import { getAdminSession } from '@/server/session';
import { loadAdminOrganizationSummary } from '@/server/organizations';

type OrganizationLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const ORG_CRUMB = { label: 'Organisations', href: '/tableau-de-bord/organisations' };

async function OrganizationDetailHeader({ id }: { id: string }) {
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();

  return (
    <PageHeader
      title={organization.name}
      description={organization.accountStatusLabel}
      breadcrumbs={[ORG_CRUMB, { label: organization.name }]}
    />
  );
}

export default async function AdminOrganizationDetailLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { id } = await params;
  const basePath = `/tableau-de-bord/organisations/${id}`;

  return (
    <div className="page-frame page-frame--wide">
      <Suspense
        fallback={<PageHeader title="Organisation" breadcrumbs={[ORG_CRUMB, { label: 'Dossier' }]} />}
      >
        <OrganizationDetailHeader id={id} />
      </Suspense>
      <div className="page-frame__content">
        <OrganizationDetailTabs basePath={basePath} />
        {children}
      </div>
    </div>
  );
}
