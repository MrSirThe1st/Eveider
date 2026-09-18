import type { DeliveryKind, DeliveryStatus } from './delivery.js';
import { isActiveDeliveryStatus, isLegacyRtsDeliveryKind } from './delivery.js';
import type { ParcelStatus } from './parcel.js';
import type { ParcelReturnMethod, ParcelReturnStatus } from './parcel-return.js';
import type { ShipmentPickupType } from './shipment.js';

/**
 * Business-facing location of a parcel — derived, never persisted.
 * Parcel status is physical truth. Customer-return process overlays Flow 3.
 * Historical RTS (`kind=return`) overlays remain readable and distinct.
 */
export type BusinessParcelLocation =
  | 'awaiting_courier'
  | 'awaiting_dropoff'
  | 'courier_assigned'
  | 'in_transit'
  | 'at_locker'
  | 'ready_for_pickup'
  | 'return_in_progress'
  | 'returned_to_business'
  | 'collected'
  | 'customer_return_requested'
  | 'customer_return_authorized'
  | 'customer_return_at_locker'
  | 'customer_return_in_transit'
  | 'customer_return_completed';

export const BUSINESS_PARCEL_LOCATIONS: readonly BusinessParcelLocation[] = [
  'awaiting_courier',
  'awaiting_dropoff',
  'courier_assigned',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'return_in_progress',
  'returned_to_business',
  'collected',
  'customer_return_requested',
  'customer_return_authorized',
  'customer_return_at_locker',
  'customer_return_in_transit',
  'customer_return_completed',
] as const;

/** Timeline origin plus location steps. `submitted` is history, never the current location. */
export type BusinessParcelProgressionStep = 'submitted' | BusinessParcelLocation;

export type BusinessParcelLocationInput = {
  parcelStatus: ParcelStatus;
  pickupType: ShipmentPickupType;
  /** Most recently created delivery for this parcel, including failed. */
  latestDeliveryStatus: DeliveryStatus | null;
  /** Kind of the most recently created delivery. */
  latestDeliveryKind?: DeliveryKind | null;
  /** Latest customer-return process row (Flow 3), never legacy RTS. */
  customerReturn?: {
    status: ParcelReturnStatus;
    method: ParcelReturnMethod | null;
  } | null;
};

export type BusinessParcelProgressionMark = {
  step: BusinessParcelProgressionStep;
  reached: boolean;
  current: boolean;
};

/** Eveider pickup: IN_TRANSIT only when parcel.status is in_transit. Assignment is a Situation overlay. */
export const COURIER_PICKUP_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'submitted',
  'awaiting_courier',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'collected',
] as const;

/** Business drop-off: no Livraison, no IN_TRANSIT. */
export const MERCHANT_DROPOFF_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'submitted',
  'awaiting_dropoff',
  'at_locker',
  'ready_for_pickup',
  'collected',
] as const;

const LEGACY_RTS_PROGRESSION_TAIL: readonly BusinessParcelProgressionStep[] = [
  'return_in_progress',
  'returned_to_business',
];

const CUSTOMER_RETURN_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'customer_return_requested',
  'customer_return_authorized',
  'customer_return_at_locker',
  'customer_return_in_transit',
  'customer_return_completed',
] as const;

const CUSTOMER_RETURN_BUSINESS_PICKUP_PROGRESSION: readonly BusinessParcelProgressionStep[] = [
  'customer_return_requested',
  'customer_return_authorized',
  'customer_return_at_locker',
  'customer_return_completed',
] as const;

function isCustomerReturnLocation(location: BusinessParcelLocation): boolean {
  return (
    location === 'customer_return_requested' ||
    location === 'customer_return_authorized' ||
    location === 'customer_return_at_locker' ||
    location === 'customer_return_in_transit' ||
    location === 'customer_return_completed'
  );
}

export function businessParcelProgression(
  pickupType: ShipmentPickupType,
  location?: BusinessParcelLocation,
  returnMethod?: ParcelReturnMethod | null,
): readonly BusinessParcelProgressionStep[] {
  const base =
    pickupType === 'merchant_dropoff' ? MERCHANT_DROPOFF_PROGRESSION : COURIER_PICKUP_PROGRESSION;
  if (location === 'return_in_progress' || location === 'returned_to_business') {
    return [...base.filter((step) => step !== 'collected'), ...LEGACY_RTS_PROGRESSION_TAIL];
  }
  if (location && isCustomerReturnLocation(location)) {
    const skipTransit =
      returnMethod === 'business_pickup' ||
      (returnMethod == null && location !== 'customer_return_in_transit');
    const tail = skipTransit
      ? CUSTOMER_RETURN_BUSINESS_PICKUP_PROGRESSION
      : CUSTOMER_RETURN_PROGRESSION;
    return [...base, ...tail];
  }
  return base;
}

/**
 * Where the company should see the parcel now.
 * Parcel status is the source of truth. Customer-return and historical RTS are overlays.
 */
export function resolveBusinessParcelLocation(
  input: BusinessParcelLocationInput,
): BusinessParcelLocation {
  const {
    parcelStatus,
    pickupType,
    latestDeliveryStatus,
    latestDeliveryKind,
    customerReturn,
  } = input;

  if (customerReturn) {
    if (customerReturn.status === 'requested') return 'customer_return_requested';
    if (customerReturn.status === 'authorized') return 'customer_return_authorized';
    if (customerReturn.status === 'awaiting_pickup') return 'customer_return_at_locker';
    if (customerReturn.status === 'in_transit') return 'customer_return_in_transit';
    if (customerReturn.status === 'completed') return 'customer_return_completed';
  }

  if (parcelStatus === 'returned') return 'customer_return_completed';
  if (parcelStatus === 'returning') return 'customer_return_in_transit';
  if (parcelStatus === 'return_at_point') return 'customer_return_at_locker';
  if (parcelStatus === 'collected') return 'collected';

  if (isLegacyRtsDeliveryKind(latestDeliveryKind) && latestDeliveryStatus) {
    if (isActiveDeliveryStatus(latestDeliveryStatus)) return 'return_in_progress';
    if (latestDeliveryStatus === 'completed') return 'returned_to_business';
  }

  if (parcelStatus === 'ready_for_pickup') return 'ready_for_pickup';
  if (parcelStatus === 'delivered_to_locker') return 'at_locker';
  if (parcelStatus === 'in_transit') return 'in_transit';

  if (pickupType === 'merchant_dropoff') return 'awaiting_dropoff';

  if (latestDeliveryStatus && isActiveDeliveryStatus(latestDeliveryStatus)) {
    return 'courier_assigned';
  }

  return 'awaiting_courier';
}

function progressionLocation(location: BusinessParcelLocation): BusinessParcelLocation {
  return location === 'courier_assigned' ? 'awaiting_courier' : location;
}

export function markBusinessParcelProgression(
  input: BusinessParcelLocationInput,
): BusinessParcelProgressionMark[] {
  const location = resolveBusinessParcelLocation(input);
  const ladderLocation = progressionLocation(location);
  const steps = businessParcelProgression(
    input.pickupType,
    ladderLocation,
    input.customerReturn?.method,
  );
  const currentIndex = steps.indexOf(ladderLocation);

  return steps.map((step, index) => ({
    step,
    reached: currentIndex >= 0 && index <= currentIndex,
    current: index === currentIndex,
  }));
}
