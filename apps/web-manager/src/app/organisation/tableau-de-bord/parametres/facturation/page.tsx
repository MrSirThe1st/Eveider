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

  const {
    owedCharges,
    billingHistory,
    pickupHoldHours,
    lockerRentalRateAmount,
    pricingCurrency,
  } = page;

  return (
    <PageFrame
      title="Facturation"
      description="Frais à la charge de votre entreprise."
      layout="standard"
    >
      <BusinessBillingForm
        pickupHoldHours={pickupHoldHours}
        lockerRentalRateAmount={lockerRentalRateAmount}
        pricingCurrency={pricingCurrency}
        owedCharges={owedCharges.map((charge) => ({
          id: charge.id,
          kind: charge.kind,
          amount: charge.amount,
          currency: charge.currency,
        }))}
        billingHistory={billingHistory.map((charge) => ({
          id: charge.id,
          kind: charge.kind,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          quantity: charge.quantity,
          createdAt: charge.createdAt.toISOString(),
          parcelId: charge.parcelId,
          parcelLabel: charge.parcelReference?.trim() || charge.parcelTrackingNumber,
        }))}
      />
    </PageFrame>
  );
}
