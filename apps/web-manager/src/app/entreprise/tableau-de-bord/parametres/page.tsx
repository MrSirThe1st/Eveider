import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessSettingsForm } from '@/components/business-settings-form';
import { loadBusinessSettingsPageData, requireBusinessPageContext } from '@/server/business';

export default async function BusinessSettingsPage() {
  const { profile } = await requireBusinessPageContext();
  const { settings, lockerList } = await loadBusinessSettingsPageData(profile.businessId);

  if (!settings) {
    redirect('/onboarding');
  }

  const address = settings.locations.find((location) => location.type === 'business_address');
  const pickup = settings.locations.find((location) => location.type === 'pickup_point');

  return (
    <PageFrame
      title="Paramètres"
      description="Toutes les informations de votre entreprise. Modifiez et enregistrez."
      layout="standard"
    >
      <BusinessSettingsForm
        fullName={profile.fullName ?? ''}
        loginEmail={profile.email}
        accessCode={settings.accessCode ?? null}
        name={settings.name}
        businessType={settings.businessType ?? 'registered_company'}
        industry={settings.industry ?? ''}
        description={settings.description ?? ''}
        contactEmail={settings.contactEmail ?? profile.email ?? ''}
        contactPhone={settings.contactPhone ?? ''}
        country={address?.country ?? 'RDC'}
        city={address?.city ?? 'Kinshasa'}
        address={address?.street ?? ''}
        legalCompanyName={settings.legalCompanyName ?? ''}
        rccmNumber={settings.rccmNumber ?? ''}
        nifNumber={settings.nifNumber ?? ''}
        legalRepName={settings.legalRepName ?? ''}
        pickupMethod={pickup?.pickupMethod === 'merchant_dropoff' ? 'merchant_dropoff' : 'courier_pickup'}
        pickupAddress={pickup?.street ?? ''}
        contactPerson={pickup?.contactPerson ?? ''}
        pickupContactPhone={pickup?.contactPhone ?? ''}
        availableDays={pickup?.availableDays ?? ''}
        availableHours={pickup?.availableHours ?? ''}
        dropoffLockerId={pickup?.dropoffLockerId ?? ''}
        lockers={lockerList}
      />
    </PageFrame>
  );
}
