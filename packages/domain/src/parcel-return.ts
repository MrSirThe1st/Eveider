import { isNetworkLockerType, type LockerType } from './locker.js';
import type { ParcelStatus } from './parcel.js';

/**
 * Customer-return process (Flow 3). Not physical parcel location, and not
 * historical `deliveries.kind=return` (legacy uncollected RTS).
 */
export type ParcelReturnStatus =
  | 'requested'
  | 'authorized'
  | 'awaiting_pickup'
  | 'in_transit'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type ParcelReturnMethod = 'eveider_return' | 'business_pickup';

export const PARCEL_RETURN_STATUSES: readonly ParcelReturnStatus[] = [
  'requested',
  'authorized',
  'awaiting_pickup',
  'in_transit',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const PARCEL_RETURN_METHODS: readonly ParcelReturnMethod[] = [
  'eveider_return',
  'business_pickup',
] as const;

export const ACTIVE_PARCEL_RETURN_STATUSES: readonly ParcelReturnStatus[] = [
  'requested',
  'authorized',
  'awaiting_pickup',
  'in_transit',
] as const;

const PARCEL_RETURN_TRANSITIONS: Record<ParcelReturnStatus, readonly ParcelReturnStatus[]> = {
  requested: ['authorized', 'rejected', 'cancelled'],
  authorized: ['awaiting_pickup', 'cancelled'],
  awaiting_pickup: ['in_transit', 'completed'],
  in_transit: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function isActiveParcelReturnStatus(status: ParcelReturnStatus): boolean {
  return (ACTIVE_PARCEL_RETURN_STATUSES as readonly string[]).includes(status);
}

export function isTerminalParcelReturnStatus(status: ParcelReturnStatus): boolean {
  return status === 'completed' || status === 'rejected' || status === 'cancelled';
}

export function canTransitionParcelReturn(
  from: ParcelReturnStatus,
  to: ParcelReturnStatus,
): boolean {
  return PARCEL_RETURN_TRANSITIONS[from].includes(to);
}

export function transitionParcelReturn(
  from: ParcelReturnStatus,
  to: ParcelReturnStatus,
): ParcelReturnStatus {
  if (!canTransitionParcelReturn(from, to)) {
    throw new Error(`Invalid return transition: ${from} → ${to}`);
  }
  return to;
}

export function canRequestCustomerReturn(parcelStatus: ParcelStatus): boolean {
  return parcelStatus === 'collected';
}

export function canAuthorizeParcelReturn(status: ParcelReturnStatus): boolean {
  return status === 'requested';
}

export function canRejectParcelReturn(status: ParcelReturnStatus): boolean {
  return status === 'requested';
}

export function canCancelParcelReturn(status: ParcelReturnStatus): boolean {
  return status === 'requested' || status === 'authorized';
}

export function canDepositCustomerReturn(status: ParcelReturnStatus): boolean {
  return status === 'authorized';
}

export function canAssignCustomerReturnDelivery(
  status: ParcelReturnStatus,
  method: ParcelReturnMethod | null,
): boolean {
  return status === 'awaiting_pickup' && method === 'eveider_return';
}

export function canCollectCustomerReturnFromLocker(
  status: ParcelReturnStatus,
  method: ParcelReturnMethod | null,
): boolean {
  return status === 'awaiting_pickup' && method === 'eveider_return';
}

export function canCompleteBusinessPickup(
  status: ParcelReturnStatus,
  method: ParcelReturnMethod | null,
): boolean {
  return status === 'awaiting_pickup' && method === 'business_pickup';
}

export function canCompleteEveiderReturnToBusiness(
  status: ParcelReturnStatus,
  method: ParcelReturnMethod | null,
): boolean {
  return status === 'in_transit' && method === 'eveider_return';
}

export function isEligibleCustomerReturnLockerType(type: LockerType): boolean {
  return isNetworkLockerType(type);
}

/** Parcel physical hops that belong to Flow 3 only. */
export function canTransitionParcelForCustomerReturn(
  from: ParcelStatus,
  to: ParcelStatus,
): boolean {
  if (from === 'collected' && to === 'return_at_point') return true;
  if (from === 'return_at_point' && to === 'returning') return true;
  if (from === 'return_at_point' && to === 'returned') return true;
  if (from === 'returning' && to === 'returned') return true;
  return false;
}
