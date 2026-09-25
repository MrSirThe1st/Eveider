import { redirect } from 'next/navigation';
import { PageFrame } from '@eveider/ui';
import { BusinessSettingsForm } from '@/components/business-settings-form';
import { loadBusinessSettingsPageData, requireBusinessPermission } from '@/server/business';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { toPickupLocationDto } from '@/lib/pickup-location-presenter';

export default async function OrganizationDetailsSettingsPage() {
  const { profile } = await requireBusinessPermission('settings');
  const { settings, lockerList } = await loadBusinessSettingsPageData(profile.businessId);

  if (!settings) {
    redirect(WEB_ROUTES.businessDashboard);
  }

  const address = settings.locations.find((location) => location.type === 'business_address');
  const pickup = settings.locations.find((location) => location.type === 'pickup_point');
  const pickupLocations = settings.locations
    .filter((location) => location.type === 'pickup_point')
    .map(toPickupLocationDto);

  return (
    <PageFrame
      title="Entreprise"
      description="Informations et lieux de collecte de votre entreprise."
      layout="standard"
    >
      <BusinessSettingsForm
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
        availableDays={pickup?.availableDays ?? ''}
        availableHours={pickup?.availableHours ?? ''}
        dropoffLockerId={pickup?.dropoffLockerId ?? ''}
        lockers={lockerList}
        pickupLocations={pickupLocations}
      />
    </PageFrame>
  );
}
