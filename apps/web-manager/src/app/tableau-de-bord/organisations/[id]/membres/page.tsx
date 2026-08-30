import { notFound } from 'next/navigation';
import { AdminOrganizationMembers } from '@/components/admin-organization-members';
import { getAdminSession } from '@/server/session';
import {
  loadAdminOrganizationMembers,
  loadAdminOrganizationSummary,
} from '@/server/organizations';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationMembersPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();
  const members = await loadAdminOrganizationMembers(ctx, id);

  return <AdminOrganizationMembers members={members} />;
}
