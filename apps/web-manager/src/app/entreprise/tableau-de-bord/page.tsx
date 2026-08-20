import { redirect } from 'next/navigation';
import { MerchantDashboard } from '@/components/merchant-dashboard';
import { loadBusinessDashboard, requireBusinessPageContext } from '@/server/business';

export default async function BusinessDashboardPage() {
  const { profile, ctx } = await requireBusinessPageContext();
  const dashboard = await loadBusinessDashboard(profile.businessId, ctx);

  if (!dashboard) {
    redirect('/onboarding');
  }

  const { summary, analytics } = dashboard;

  if (summary.status === 'onboarding' || summary.status === 'draft') {
    redirect('/onboarding');
  }

  return (
    <MerchantDashboard businessName={summary.name} status={summary.status} analytics={analytics} />
  );
}
