import { redirect } from 'next/navigation';
import { deriveOrganizationVerificationStatus } from '@eveider/domain';
import { MerchantDashboard } from '@/components/merchant-dashboard';
import { loadBusinessDashboard, requireBusinessPermission } from '@/server/business';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default async function BusinessDashboardPage() {
  const { profile, ctx } = await requireBusinessPermission('dashboard');
  const dashboard = await loadBusinessDashboard(profile.businessId, ctx);

  if (!dashboard) {
    redirect(WEB_ROUTES.register);
  }

  const { business, analytics, verification } = dashboard;

  return (
    <MerchantDashboard
      businessName={business.name}
      status={business.status}
      verificationStatus={deriveOrganizationVerificationStatus(verification?.status)}
      verificationNotes={verification?.reviewNotes}
      analytics={analytics}
    />
  );
}
