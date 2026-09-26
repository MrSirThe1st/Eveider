import type { RecipientCollectionCode } from './commercial.js';
import type { CompartmentSize } from './locker-layout.js';
import { suggestCompartmentForParcelSize } from './locker-settings.js';
import type { DeliveryKind, DeliveryStatus } from './delivery.js';
import type { LockerType, CompartmentStatus } from './locker.js';
import { isNetworkLockerType } from './locker.js';
import type { ParcelStatus } from './parcel.js';
import type { ParcelReturnMethod, ParcelReturnStatus } from './parcel-return.js';
import type { ShipmentPickupType } from './shipment.js';

export const LOCKER_ACTIONS = [
  'deposit',
  'driver_pickup',
  'recipient_collection',
  'business_return_pickup',
] as const;

export type LockerAction = (typeof LOCKER_ACTIONS)[number];

export const LOCKER_ACTION_ACTOR_TYPES = [
  'eveider_driver',
  'business_representative',
  'recipient',
] as const;

export type LockerActionActorType = (typeof LOCKER_ACTION_ACTOR_TYPES)[number];

export const LOCKER_ACTION_SESSION_STATUSES = [
  'authorized',
  'confirmed',
  'expired',
  'cancelled',
] as const;

export type LockerActionSessionStatus = (typeof LOCKER_ACTION_SESSION_STATUSES)[number];

/** Default authorization window before lazy expiry/release. */
export const DEFAULT_LOCKER_ACTION_TTL_SECONDS = 180;

export const LOCKER_DENIAL_REASONS = [
  'PARCEL_NOT_FOUND',
  'INVALID_CREDENTIALS',
  'WRONG_LOCKER',
  'INVALID_PARCEL_STATE',
  'DRIVER_NOT_ASSIGNED',
  'NOT_EVEIDER_DRIVER',
  'RETURN_NOT_AUTHORIZED',
  'WRONG_RETURN_METHOD',
  'PAYMENT_REQUIRED',
  'CANONICAL_CHARGE_MISSING',
  'NO_COMPARTMENT_AVAILABLE',
  'SESSION_CONFLICT',
  'LOCKER_UNAVAILABLE',
  'LOCKER_TYPE_NOT_SUPPORTED',
  'SESSION_NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_CANCELLED',
  'SESSION_MISMATCH',
  'CREDENTIAL_NOT_FOUND',
  'CREDENTIAL_NOT_ACTIVE',
] as const;

export type LockerDenialReason = (typeof LOCKER_DENIAL_REASONS)[number];

export function isLockerDenialReason(value: string): value is LockerDenialReason {
  return (LOCKER_DENIAL_REASONS as readonly string[]).includes(value);
}

export function lockerDenialFromCommercial(
  code: RecipientCollectionCode,
): LockerDenialReason | null {
  if (code === 'AUTHORIZED') return null;
  if (code === 'PAYMENT_OUTSTANDING') return 'PAYMENT_REQUIRED';
  if (code === 'CANONICAL_CHARGE_MISSING') return 'CANONICAL_CHARGE_MISSING';
  return 'INVALID_PARCEL_STATE';
}

export function isHardwareSmartLocker(type: LockerType | string | null | undefined): boolean {
  return isNetworkLockerType(type);
}

export function lockerActionSessionIsActive(
  status: LockerActionSessionStatus,
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return status === 'authorized' && expiresAt.getTime() > now.getTime();
}

export function lockerActionSessionConfirmDenial(
  session: {
    status: LockerActionSessionStatus;
    expiresAt: Date;
    action: LockerAction;
    parcelId: string;
    lockerId: string;
    compartmentId: string | null;
  },
  expected: {
    action?: LockerAction;
    parcelId?: string;
    lockerId: string;
    compartmentId?: string | null;
  },
  now: Date = new Date(),
): LockerDenialReason | null {
  if (session.status === 'cancelled') return 'SESSION_CANCELLED';
  if (session.status === 'expired') return 'SESSION_EXPIRED';
  if (session.status === 'authorized' && session.expiresAt.getTime() <= now.getTime()) {
    return 'SESSION_EXPIRED';
  }
  if (session.lockerId !== expected.lockerId) return 'WRONG_LOCKER';
  if (expected.action && session.action !== expected.action) return 'SESSION_MISMATCH';
  if (expected.parcelId && session.parcelId !== expected.parcelId) return 'SESSION_MISMATCH';
  if (
    expected.compartmentId != null &&
    session.compartmentId != null &&
    session.compartmentId !== expected.compartmentId
  ) {
    return 'SESSION_MISMATCH';
  }
  return null;
}

export function canCancelLockerActionSession(status: LockerActionSessionStatus): boolean {
  return status === 'authorized';
}

/** Outbound Eveider Livraison may complete from any non-terminal physical stage. */
export function canCompleteOutboundDeliveryFromLocker(status: DeliveryStatus): boolean {
  return (
    status === 'started' ||
    status === 'scanned' ||
    status === 'drop_off_pending'
  );
}

export function completeOutboundDeliveryFromLocker(status: DeliveryStatus): DeliveryStatus {
  if (status === 'completed') return 'completed';
  if (!canCompleteOutboundDeliveryFromLocker(status)) {
    throw new Error(`Invalid delivery transition for locker deposit: ${status} → completed`);
  }
  return 'completed';
}

export function isActiveOutboundDelivery(kind: DeliveryKind, status: DeliveryStatus): boolean {
  return (
    kind === 'outbound' &&
    (status === 'assigned' ||
      status === 'accepted' ||
      status === 'started' ||
      status === 'scanned' ||
      status === 'drop_off_pending')
  );
}

export function isActiveCustomerReturnDelivery(
  kind: DeliveryKind,
  status: DeliveryStatus,
): boolean {
  return (
    kind === 'customer_return' &&
    (status === 'assigned' ||
      status === 'accepted' ||
      status === 'started' ||
      status === 'scanned')
  );
}

export function depositRequiresReservation(action: LockerAction): boolean {
  return action === 'deposit';
}

export function occupiedCompartmentIsTarget(action: LockerAction): boolean {
  return (
    action === 'driver_pickup' ||
    action === 'recipient_collection' ||
    action === 'business_return_pickup'
  );
}

export type CompatibleCompartment = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
};

export function pickDepositCompartment(
  compartments: CompatibleCompartment[],
  parcelSize: CompartmentSize,
): CompatibleCompartment | null {
  const available = compartments.filter((compartment) => compartment.status === 'available');
  const picked = suggestCompartmentForParcelSize(available, parcelSize);
  if (!picked) return null;
  return available.find((compartment) => compartment.id === picked.id) ?? null;
}

export function flow1DepositEligible(input: {
  pickupType: ShipmentPickupType;
  parcelStatus: ParcelStatus;
  lockerType: LockerType;
}): boolean {
  if (input.pickupType !== 'courier_pickup') return false;
  if (input.parcelStatus !== 'in_transit') return false;
  return isHardwareSmartLocker(input.lockerType);
}

export function flow2DepositEligible(input: {
  pickupType: ShipmentPickupType;
  parcelStatus: ParcelStatus;
  lockerType: LockerType;
}): boolean {
  if (input.pickupType !== 'merchant_dropoff') return false;
  if (input.parcelStatus !== 'created') return false;
  return isHardwareSmartLocker(input.lockerType);
}

export function recipientReturnDepositEligible(input: {
  parcelStatus: ParcelStatus;
  returnStatus: ParcelReturnStatus | null;
  lockerType: LockerType;
}): boolean {
  if (input.parcelStatus !== 'collected') return false;
  if (input.returnStatus !== 'authorized') return false;
  return isHardwareSmartLocker(input.lockerType);
}

export function driverReturnPickupEligible(input: {
  parcelStatus: ParcelStatus;
  returnStatus: ParcelReturnStatus | null;
  returnMethod: ParcelReturnMethod | null;
}): boolean {
  return (
    input.parcelStatus === 'return_at_point' &&
    input.returnStatus === 'awaiting_pickup' &&
    input.returnMethod === 'eveider_return'
  );
}

export function businessReturnPickupEligible(input: {
  parcelStatus: ParcelStatus;
  returnStatus: ParcelReturnStatus | null;
  returnMethod: ParcelReturnMethod | null;
}): boolean {
  return (
    input.parcelStatus === 'return_at_point' &&
    input.returnStatus === 'awaiting_pickup' &&
    input.returnMethod === 'business_pickup'
  );
}

export function recipientCollectionEligible(parcelStatus: ParcelStatus): boolean {
  return parcelStatus === 'ready_for_pickup';
}
