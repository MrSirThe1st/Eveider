import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessBillingForm } from '@/components/business-billing-form';
import { loadBusinessBillingPageData, requireBusinessPermission } from '@/server/business';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default async function OrganizationBillingSettingsPage() {
  const { profile } = await requireBusinessPermission('billing');
  const billing = await loadBusinessBillingPageData(profile.businessId);

  if (!billing) {
    redirect(WEB_ROUTES.businessDashboard);
  }

  return (
    <PageFrame
      title="Paiement & limites"
      description="Pour votre entreprise : qui paie la livraison, comment Eveider vous règle, et vos plafonds."
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
