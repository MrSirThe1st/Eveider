import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessSettingsForm } from '@/components/business-settings-form';
import { loadOnboardingPageData, requireBusinessPageContext } from '@/server/business';

export default async function BusinessSettingsPage() {
  const { profile } = await requireBusinessPageContext();
  const { summary, lockerList } = await loadOnboardingPageData(profile.businessId);

  if (!summary) {
    redirect('/onboarding');
  }

  const address = summary.locations.find((location) => location.type === 'business_address');
  const pickup = summary.locations.find((location) => location.type === 'pickup_point');

  return (
    <PageFrame
      title="Paramètres"
      description="Toutes les informations de votre entreprise. Modifiez et enregistrez."
      layout="standard"
    >
      <BusinessSettingsForm
        fullName={profile.fullName ?? ''}
        loginEmail={profile.email}
        accessCode={summary.accessCode ?? null}
        name={summary.name}
        businessType={summary.businessType ?? 'registered_company'}
        industry={summary.industry ?? ''}
        description={summary.description ?? ''}
        contactEmail={summary.contactEmail ?? profile.email ?? ''}
        contactPhone={summary.contactPhone ?? ''}
        country={address?.country ?? 'RDC'}
        city={address?.city ?? 'Kinshasa'}
        address={address?.street ?? ''}
        legalCompanyName={summary.legalCompanyName ?? ''}
        rccmNumber={summary.rccmNumber ?? ''}
        nifNumber={summary.nifNumber ?? ''}
        legalRepName={summary.legalRepName ?? ''}
        pickupMethod={pickup?.pickupMethod === 'merchant_dropoff' ? 'merchant_dropoff' : 'courier_pickup'}
        pickupAddress={pickup?.street ?? ''}
        contactPerson={pickup?.contactPerson ?? ''}
        pickupContactPhone={pickup?.contactPhone ?? ''}
        availableDays={pickup?.availableDays ?? ''}
        availableHours={pickup?.availableHours ?? ''}
        dropoffLockerId={pickup?.dropoffLockerId ?? ''}
        lockers={lockerList.map((locker) => ({
          id: locker.id,
          name: locker.name,
          address: locker.address,
        }))}
      />
    </PageFrame>
  );
}
