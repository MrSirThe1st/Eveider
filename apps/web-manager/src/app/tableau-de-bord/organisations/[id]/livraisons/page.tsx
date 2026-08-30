import { notFound } from 'next/navigation';
import { AdminOrganizationDeliveries } from '@/components/admin-organization-deliveries';
import { getAdminSession } from '@/server/session';
import {
  loadAdminOrganizationDeliveries,
  loadAdminOrganizationSummary,
} from '@/server/organizations';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationDeliveriesPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();
  const deliveries = await loadAdminOrganizationDeliveries(ctx, id);

  return <AdminOrganizationDeliveries deliveries={deliveries} />;
}
