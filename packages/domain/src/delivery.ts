export type DeliveryStatus =
  | 'assigned'
  | 'scanned'
  | 'drop_off_pending'
  | 'completed'
  | 'failed';

/** Direction of a delivery leg. One parcel may have many deliveries over time. */
export type DeliveryKind = 'outbound' | 'return';

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'assigned',
  'scanned',
  'drop_off_pending',
  'completed',
  'failed',
] as const;

export const DELIVERY_KINDS: readonly DeliveryKind[] = ['outbound', 'return'] as const;

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  assigned: ['scanned', 'failed'],
  scanned: ['drop_off_pending', 'failed'],
  drop_off_pending: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function transitionDelivery(from: DeliveryStatus, to: DeliveryStatus): DeliveryStatus {
  if (!canTransitionDelivery(from, to)) {
    throw new Error(`Invalid delivery transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'completed' || status === 'failed';
}

export function isActiveDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'assigned' || status === 'scanned' || status === 'drop_off_pending';
}

/**
 * Return leg (locker → merchant) may start when the parcel is at the point
 * and nothing is still in movement.
 *
 * Outbound courier completion is required for `courier_pickup`.
 * `merchant_dropoff` parcels may return after business deposit (no outbound delivery).
 */
export function canCreateReturnLeg(input: {
  parcelStatus: import('./parcel.js').ParcelStatus;
  hasActiveDelivery: boolean;
  hasCompletedOutbound: boolean;
  hasCompletedReturn?: boolean;
  /** When true, outbound courier completion is not required. */
  merchantDropoffArrived?: boolean;
}): boolean {
  if (input.hasActiveDelivery) return false;
  if (input.hasCompletedReturn) return false;
  const arrivedViaCourier = input.hasCompletedOutbound;
  const arrivedViaMerchant = Boolean(input.merchantDropoffArrived);
  if (!arrivedViaCourier && !arrivedViaMerchant) return false;
  return (
    input.parcelStatus === 'delivered_to_locker' || input.parcelStatus === 'ready_for_pickup'
  );
}

/** Courier-facing history window. Active deliveries are always included. */
export const COURIER_HISTORY_DAYS = 90;
