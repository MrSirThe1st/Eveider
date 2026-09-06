import { notFound } from 'next/navigation';
import { AdminApplicationReview } from '@/components/admin-application-review';
import {
  getAdminOrganizationVerificationDetail,
  getNextBusinessApplicationId,
} from '@/server/organizations';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationVerificationDossierPage({ params }: PageProps) {
  const { id: businessId } = await params;
  const { ctx } = await getAdminSession();
  const [business, nextApplicationId] = await Promise.all([
    getAdminOrganizationVerificationDetail(businessId),
    getNextBusinessApplicationId(ctx, businessId),
  ]);

  if (!business) {
    notFound();
  }

  return (
    <AdminApplicationReview
      business={business}
      nextApplicationId={nextApplicationId}
      hidePageChrome
      queueHref="/tableau-de-bord/organisations/verification"
    />
  );
}
