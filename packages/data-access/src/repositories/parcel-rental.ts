import type { LockerType } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { LockerSettingsRepository } from './locker-settings.repository.js';
import { ParcelChargeRepository } from './parcel-charge.repository.js';
import { PricingRepository } from './pricing.repository.js';

/** Sync/finalize locker rental for a parcel that reached ready_for_pickup. */
export async function syncParcelLockerRental(
  db: Queryable,
  input: {
    parcelId: string;
    businessId: string;
    readyForPickupAt: Date | null;
    endAt: Date;
    lockerType: LockerType | null;
    compartmentId: string | null;
    finalize: boolean;
  },
) {
  if (!input.readyForPickupAt) return null;

  const pricing = new PricingRepository(db);
  const lockerSettings = new LockerSettingsRepository(db);
  const charges = new ParcelChargeRepository(db);

  const [rules, settings] = await Promise.all([
    pricing.getDeliveryRules(),
    lockerSettings.getNetworkSettings(),
  ]);

  return charges.syncLockerRental(db, {
    parcelId: input.parcelId,
    businessId: input.businessId,
    readyForPickupAt: input.readyForPickupAt,
    endAt: input.endAt,
    freeHoldHours: settings.pickupHoldHours,
    currentRateAmount: rules.lockerRentalRateAmount,
    currency: rules.currency,
    lockerType: input.lockerType,
    compartmentId: input.compartmentId,
    finalize: input.finalize,
  });
}
