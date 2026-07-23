import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';
import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { AdminApplicationReview } from '@/components/admin-application-review';
import { getBusinessApplicationDetail } from '@/server/business-applications';

export default async function AdminApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: businessId } = await params;
  const business = await getBusinessApplicationDetail(businessId);

  if (!business) {
    notFound();
  }

  const statusLabel =
    BUSINESS_STATUS_LABELS[business.status as BusinessStatus] ?? business.status;

  return (
    <PageFrame
      title={`Revue KYC — ${business.name}`}
      description={`Statut actuel : ${statusLabel}`}
      breadcrumbs={[
        {
          label: 'Dossiers business',
          href: '/tableau-de-bord/entreprises/applications',
        },
        { label: business.name },
      ]}
    >
      <AdminApplicationReview business={business} hidePageChrome />
    </PageFrame>
  );
}
