import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { toPickupLocationDto } from '@/lib/pickup-location-presenter';

/** Prefill sender + default pickup type for Create Shipment. */
export async function GET() {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const businessId = auth.session.profile.businessId!;
    const { businesses, businessOnboarding } = createRepositories();
    const business = await businesses.findById(auth.session.ctx, businessId);
    if (!business) {
      return NextResponse.json(fail('Entreprise introuvable'), { status: 404 });
    }

    const locations = await businessOnboarding.listPickupLocations(businessId);
    const defaultLocation = locations.find((location) => location.isDefault) ?? locations[0] ?? null;
    const settings = await businessOnboarding.getSettingsSnapshot(businessId);
    const anyLocation = settings?.locations[0] ?? null;
    const pickupMethod =
      defaultLocation?.pickupMethod ??
      anyLocation?.pickupMethod ??
      'courier_pickup';

    return NextResponse.json(
      ok({
        senderName: defaultLocation?.contactPerson || business.name,
        senderPhone: defaultLocation?.contactPhone || business.contactPhone || '',
        senderAddress: defaultLocation?.street || business.residentialAddress,
        pickupType: pickupMethod === 'merchant_dropoff' ? 'merchant_dropoff' : 'courier_pickup',
        dropoffLockerId: defaultLocation?.dropoffLockerId ?? anyLocation?.dropoffLockerId ?? null,
        pickupLocationId: defaultLocation?.id ?? null,
        pickupLocations: locations.map(toPickupLocationDto),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
