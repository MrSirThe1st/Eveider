import type { ShipmentPickupType } from './shipment.js';

/**
 * Persisted parcel lifecycle.
 *
 * Canonical names (Phase 2) map onto existing enum values — no rename migration:
 * - CREATED / AWAITING_HANDOFF → `created`
 * - IN_TRANSIT → `in_transit` (Eveider transport only)
 * - AT_POINT → `delivered_to_locker` (must be stored; do not skip)
 * - READY_FOR_PICKUP → `ready_for_pickup` (PIN + recipient notify)
 * - COLLECTED → `collected`
 *
 * Business Colis Situation derives from this status — see parcel-location.ts.
 */
export type ParcelStatus =
  | 'created'
  | 'in_transit'
  | 'delivered_to_locker'
  | 'ready_for_pickup'
  | 'collected'
  | 'return_at_point'
  | 'returning'
  | 'returned';

/** Stored value for AT_POINT. Deposit must persist this; READY is a later hop. */
export const PARCEL_AT_POINT_STATUS: ParcelStatus = 'delivered_to_locker';

export const OUTBOUND_PARCEL_STATUSES: readonly ParcelStatus[] = [
  'created',
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
  'collected',
] as const;

export const RETURN_PARCEL_STATUSES: readonly ParcelStatus[] = [
  'return_at_point',
  'returning',
  'returned',
] as const;

export const PARCEL_STATUSES: readonly ParcelStatus[] = [
  ...OUTBOUND_PARCEL_STATUSES,
  ...RETURN_PARCEL_STATUSES,
] as const;

const PARCEL_TRANSITIONS: Record<ParcelStatus, readonly ParcelStatus[]> = {
  /** Eveider pickup scans to IN_TRANSIT; business drop-off deposits to AT_POINT. */
  created: ['in_transit', 'delivered_to_locker'],
  in_transit: ['delivered_to_locker'],
  /** READY requires an explicit hop (PIN/credential sync) — not automatic on deposit. */
  delivered_to_locker: ['ready_for_pickup'],
  ready_for_pickup: ['collected'],
  collected: ['return_at_point'],
  return_at_point: ['returning', 'returned'],
  returning: ['returned'],
  returned: [],
};

export function canTransitionParcel(from: ParcelStatus, to: ParcelStatus): boolean {
  return PARCEL_TRANSITIONS[from].includes(to);
}

/** Merchant drop-off never enters Eveider transportation (`in_transit`). */
export function canTransitionParcelForPickup(
  from: ParcelStatus,
  to: ParcelStatus,
  pickupType: ShipmentPickupType,
): boolean {
  if (pickupType === 'merchant_dropoff' && to === 'in_transit') return false;
  return canTransitionParcel(from, to);
}

export function transitionParcel(from: ParcelStatus, to: ParcelStatus): ParcelStatus {
  if (!canTransitionParcel(from, to)) {
    throw new Error(`Invalid parcel transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalParcelStatus(status: ParcelStatus): boolean {
  return status === 'returned';
}

export function isOutboundCompleteParcelStatus(status: ParcelStatus): boolean {
  return status === 'collected';
}

export function isParcelPreHandoff(status: ParcelStatus): boolean {
  return status === 'created';
}

export function isParcelAtPoint(status: ParcelStatus): boolean {
  return status === PARCEL_AT_POINT_STATUS;
}

/** Deposit / return operations persist these; manual PATCH must not. */
export function isDepositOnlyParcelStatus(status: ParcelStatus): boolean {
  return (
    status === PARCEL_AT_POINT_STATUS ||
    status === 'return_at_point' ||
    status === 'returning' ||
    status === 'returned'
  );
}

export function canPrepareParcelCollection(status: ParcelStatus): boolean {
  return status === PARCEL_AT_POINT_STATUS || status === 'ready_for_pickup';
}

/** Admin next-status buttons: READY and COLLECTED, never a fake deposit. */
export function adminAdvanceableParcelStatuses(current: ParcelStatus): ParcelStatus[] {
  return PARCEL_STATUSES.filter(
    (status) => canTransitionParcel(current, status) && !isDepositOnlyParcelStatus(status),
  );
}
