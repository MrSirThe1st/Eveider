import { redirect } from 'next/navigation';
import { MerchantDashboard } from '@/components/merchant-dashboard';
import { loadBusinessDashboard, requireBusinessPageContext } from '@/server/business';

export default async function BusinessDashboardPage() {
  const { profile, ctx } = await requireBusinessPageContext();
  const dashboard = await loadBusinessDashboard(profile.businessId, ctx);

  if (!dashboard) {
    redirect('/onboarding');
  }

  const { business, analytics } = dashboard;

  if (business.status === 'onboarding' || business.status === 'draft') {
    redirect('/onboarding');
  }

  return (
    <MerchantDashboard businessName={business.name} status={business.status} analytics={analytics} />
  );
}
