import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessBillingForm } from '@/components/business-billing-form';
import { loadBusinessBillingPageData, requireBusinessPermission } from '@/server/business';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default async function OrganizationBillingSettingsPage() {
  const { profile } = await requireBusinessPermission('billing');
  const page = await loadBusinessBillingPageData(profile.businessId);

  if (!page.billing) {
    redirect(WEB_ROUTES.businessDashboard);
  }

  const { billing, owedCharges, pickupHoldHours } = page;

  return (
    <PageFrame
      title="Facturation"
      description="Montants dus à Eveider, compte de règlement et limites."
      layout="standard"
    >
      <BusinessBillingForm
        paymentRule={billing.paymentRule ?? 'customer_pays'}
        billingType={billing.billingType ?? 'pay_per_shipment'}
        payoutMethod={billing.payoutMethod ?? 'mobile_money_orange'}
        accountHolder={billing.accountHolder ?? ''}
        accountNumber={billing.accountNumber ?? ''}
        dailyShipments={billing.dailyShipments ?? null}
        pickupHoldHours={pickupHoldHours}
        owedCharges={owedCharges.map((charge) => ({
          id: charge.id,
          kind: charge.kind,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
        }))}
      />
    </PageFrame>
  );
}
