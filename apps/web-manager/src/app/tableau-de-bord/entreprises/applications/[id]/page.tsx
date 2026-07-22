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

  return <AdminApplicationReview business={business} />;
}
