import { notFound } from 'next/navigation';
import { AdminOrganizationOverview } from '@/components/admin-organization-overview';
import { getAdminSession } from '@/server/session';
import {
  loadAdminOrganizationOperatingAccess,
  loadAdminOrganizationSummary,
} from '@/server/organizations';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const [organization, operatingAccess] = await Promise.all([
    loadAdminOrganizationSummary(ctx, id),
    loadAdminOrganizationOperatingAccess(ctx, id),
  ]);
  if (!organization || !operatingAccess) notFound();

  return (
    <AdminOrganizationOverview
      organization={organization}
      operatingAccess={operatingAccess}
    />
  );
}
