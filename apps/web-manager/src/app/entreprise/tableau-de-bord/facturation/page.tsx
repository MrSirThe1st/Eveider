import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessBillingForm } from '@/components/business-billing-form';
import { loadOnboardingPageData, requireBusinessPageContext } from '@/server/business';

export default async function BusinessBillingPage() {
  const { profile } = await requireBusinessPageContext();
  const { summary } = await loadOnboardingPageData(profile.businessId);

  if (!summary) {
    redirect('/onboarding');
  }

  return (
    <PageFrame
      title="Facturation"
      description="Règles de paiement, règlement et plafonds de votre compte."
      layout="standard"
    >
      <BusinessBillingForm
        paymentRule={summary.billingAccount?.paymentRule ?? 'merchant_pays'}
        billingType={summary.billingAccount?.billingType ?? 'pay_per_shipment'}
        payoutMethod={summary.settlementAccount?.payoutMethod ?? 'mobile_money_orange'}
        accountHolder={summary.settlementAccount?.accountHolder ?? ''}
        accountNumber={summary.settlementAccount?.accountNumber ?? ''}
        dailyShipments={summary.limit?.dailyShipments ?? null}
        codDailyLimitUsd={summary.limit?.codDailyLimitUsd ?? null}
      />
    </PageFrame>
  );
}
