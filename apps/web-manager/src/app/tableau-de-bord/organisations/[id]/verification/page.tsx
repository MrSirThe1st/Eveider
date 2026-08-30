import { notFound } from 'next/navigation';
import { AdminOrganizationVerificationTab } from '@/components/admin-organization-verification-tab';
import { getAdminSession } from '@/server/session';
import {
  getAdminOrganizationVerificationDetail,
  loadAdminOrganizationSummary,
} from '@/server/organizations';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationVerificationPage({ params }: PageProps) {
  const { id } = await params;
  const { ctx } = await getAdminSession();
  const organization = await loadAdminOrganizationSummary(ctx, id);
  if (!organization) notFound();

  const detail = await getAdminOrganizationVerificationDetail(id);
  const latest = detail?.verifications[0];

  return (
    <AdminOrganizationVerificationTab
      organizationId={id}
      organizationName={organization.name}
      verificationStatus={organization.verificationStatus}
      reviewNotes={latest?.reviewNotes ?? null}
      submittedAt={latest?.submittedAt ?? null}
    />
  );
}
