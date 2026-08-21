import type { DeliveryStatus } from './delivery.js';
import type { ParcelStatus } from './parcel.js';
import type { ShipmentPickupType } from './shipment.js';

/**
 * Business-facing location of a parcel — derived, never persisted.
 * Canonical lifecycle remains {@link ParcelStatus}; movement remains {@link DeliveryStatus}.
 */
export type BusinessParcelLocation =
  | 'awaiting_courier'
  | 'awaiting_dropoff'
  | 'courier_assigned'
  | 'in_transit'
  | 'at_locker'
  | 'ready_for_pickup'
  | 'collected';

export const BUSINESS_PARCEL_LOCATIONS: readonly BusinessParcelLocation[] = [
  'awaiting_courier',
  'awaiting_dropoff',
  'courier_assigned',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'collected',
] as const;

/** Timeline origin plus location steps. `submitted` is history, never the current location. */
export type BusinessParcelProgressionStep = 'submitted' | BusinessParcelLocation;

export type BusinessParcelLocationInput = {
  parcelStatus: ParcelStatus;
  pickupType: ShipmentPickupType;
  /** Most recently created delivery for this parcel, including failed. */
  latestDeliveryStatus: DeliveryStatus | null;
};

export type BusinessParcelProgressionMark = {
  step: BusinessParcelProgressionStep;
  reached: boolean;
  current: boolean;
};

export const COURIER_PICKUP_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'submitted',
  'awaiting_courier',
  'courier_assigned',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'collected',
] as const;

export const MERCHANT_DROPOFF_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'submitted',
  'awaiting_dropoff',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'collected',
] as const;

const MOVEMENT_STARTED: ReadonlySet<DeliveryStatus> = new Set([
  'scanned',
  'drop_off_pending',
  'completed',
]);

export function businessParcelProgression(
  pickupType: ShipmentPickupType,
): readonly BusinessParcelProgressionStep[] {
  return pickupType === 'merchant_dropoff'
    ? MERCHANT_DROPOFF_PROGRESSION
    : COURIER_PICKUP_PROGRESSION;
}

/**
 * Where the company should see the parcel now.
 * Parcel status wins after `created`; pickup type + latest delivery refine `created` only.
 */
export function resolveBusinessParcelLocation(
  input: BusinessParcelLocationInput,
): BusinessParcelLocation {
  const { parcelStatus, pickupType, latestDeliveryStatus } = input;

  if (parcelStatus === 'collected') return 'collected';
  if (parcelStatus === 'ready_for_pickup') return 'ready_for_pickup';
  if (parcelStatus === 'delivered_to_locker') return 'at_locker';
  if (parcelStatus === 'in_transit') return 'in_transit';

  if (latestDeliveryStatus && MOVEMENT_STARTED.has(latestDeliveryStatus)) {
    return 'in_transit';
  }

  if (pickupType === 'courier_pickup' && latestDeliveryStatus === 'assigned') {
    return 'courier_assigned';
  }

  return pickupType === 'merchant_dropoff' ? 'awaiting_dropoff' : 'awaiting_courier';
}

export function markBusinessParcelProgression(
  input: BusinessParcelLocationInput,
): BusinessParcelProgressionMark[] {
  const steps = businessParcelProgression(input.pickupType);
  const location = resolveBusinessParcelLocation(input);
  const currentIndex = steps.indexOf(location);

  return steps.map((step, index) => ({
    step,
    reached: currentIndex >= 0 && index <= currentIndex,
    current: index === currentIndex,
  }));
}
