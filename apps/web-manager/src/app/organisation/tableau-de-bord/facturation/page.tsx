import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessBillingForm } from '@/components/business-billing-form';
import { loadBusinessBillingPageData, requireBusinessPermission } from '@/server/business';

export default async function BusinessBillingPage() {
  const { profile } = await requireBusinessPermission('billing');
  const billing = await loadBusinessBillingPageData(profile.businessId);

  if (!billing) {
    redirect('/onboarding');
  }

  return (
    <PageFrame
      title="Facturation"
      description="Règles de paiement, règlement et plafonds de votre compte."
      layout="standard"
    >
      <BusinessBillingForm
        paymentRule={billing.paymentRule ?? 'merchant_pays'}
        billingType={billing.billingType ?? 'pay_per_shipment'}
        payoutMethod={billing.payoutMethod ?? 'mobile_money_orange'}
        accountHolder={billing.accountHolder ?? ''}
        accountNumber={billing.accountNumber ?? ''}
        dailyShipments={billing.dailyShipments ?? null}
        codDailyLimitUsd={billing.codDailyLimitUsd ?? null}
      />
    </PageFrame>
  );
}
