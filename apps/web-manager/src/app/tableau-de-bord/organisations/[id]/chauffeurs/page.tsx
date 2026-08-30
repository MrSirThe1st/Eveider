import { notFound } from 'next/navigation';
import { AdminOrganizationDrivers } from '@/components/admin-organization-drivers';
import { getAdminSession } from '@/server/session';
import {
  loadAdminOrganizationDrivers,
  loadAdminOrganizationSummary,
} from '@/server/organizations';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationDriversPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();
  const drivers = await loadAdminOrganizationDrivers(ctx, id);

  return <AdminOrganizationDrivers drivers={drivers} />;
}
