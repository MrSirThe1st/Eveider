import { redirect } from 'next/navigation';
import { hasBusinessPermission } from '@eveider/domain';
import { MerchantDashboard } from '@/components/merchant-dashboard';
import { loadBusinessDashboard, requireBusinessPermission } from '@/server/business';

export default async function BusinessDashboardPage() {
  const { profile, ctx } = await requireBusinessPermission('dashboard');
  const dashboard = await loadBusinessDashboard(profile.businessId, ctx);

  if (!dashboard) {
    redirect('/onboarding');
  }

  const { business, analytics } = dashboard;

  if (
    (business.status === 'onboarding' || business.status === 'draft') &&
    hasBusinessPermission(profile.userRole, 'settings')
  ) {
    redirect('/onboarding');
  }

  return (
    <MerchantDashboard businessName={business.name} status={business.status} analytics={analytics} />
  );
}
