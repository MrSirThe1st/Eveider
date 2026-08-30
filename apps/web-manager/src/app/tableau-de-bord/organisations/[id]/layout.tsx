import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { OrganizationDetailTabs } from '@/components/organization-detail-tabs';
import { getAdminSession } from '@/server/session';
import { loadAdminOrganizationSummary } from '@/server/organizations';

type OrganizationLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationDetailLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();

  const basePath = `/tableau-de-bord/organisations/${id}`;

  return (
    <PageFrame
      title={organization.name}
      description={`${organization.accountStatusLabel} · ${organization.verificationStatusLabel}`}
      layout="wide"
      breadcrumbs={[
        { label: 'Organisations', href: '/tableau-de-bord/organisations' },
        { label: organization.name },
      ]}
    >
      <OrganizationDetailTabs basePath={basePath} />
      {children}
    </PageFrame>
  );
}
