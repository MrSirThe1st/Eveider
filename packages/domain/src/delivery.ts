export type DeliveryStatus =
  | 'assigned'
  | 'accepted'
  | 'started'
  | 'scanned'
  | 'drop_off_pending'
  | 'completed'
  | 'failed';

/** Direction of a delivery leg. One parcel may have many deliveries over time. */
/** Direction of a delivery leg. `return` is legacy RTS; `customer_return` is Flow 3A. */
export type DeliveryKind = 'outbound' | 'return' | 'customer_return';

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'assigned',
  'accepted',
  'started',
  'scanned',
  'drop_off_pending',
  'completed',
  'failed',
] as const;

export const DELIVERY_KINDS: readonly DeliveryKind[] = ['outbound', 'return', 'customer_return'] as const;

/**
 * Assignment / execution gates before physical work:
 *   assigned → accepted → started → scanned → drop_off_pending → completed|failed
 *
 * `scanned` means "prise en charge confirmée" (barcode scan OR manual confirm).
 * Barcode scanning is optional; drivers must still confirm they are handling the parcel
 * via scan or manual selection before deposit / return handoff.
 */
const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  assigned: ['accepted', 'failed'],
  accepted: ['started', 'failed'],
  started: ['scanned', 'failed'],
  scanned: ['drop_off_pending', 'failed'],
  drop_off_pending: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export function canTransitionDelivery(
  from: DeliveryStatus,
  to: DeliveryStatus,
  kind?: DeliveryKind,
): boolean {
  if (kind === 'customer_return') {
    if (from === 'assigned') return to === 'accepted' || to === 'failed';
    if (from === 'accepted') return to === 'started' || to === 'failed';
    if (from === 'started') return to === 'scanned' || to === 'failed';
    if (from === 'scanned') return to === 'completed' || to === 'failed';
    return false;
  }
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function transitionDelivery(
  from: DeliveryStatus,
  to: DeliveryStatus,
  kind?: DeliveryKind,
): DeliveryStatus {
  if (!canTransitionDelivery(from, to, kind)) {
    throw new Error(`Invalid delivery transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'completed' || status === 'failed';
}

export function isActiveDeliveryStatus(status: DeliveryStatus): boolean {
  return (
    status === 'assigned' ||
    status === 'accepted' ||
    status === 'started' ||
    status === 'scanned' ||
    status === 'drop_off_pending'
  );
}

/** Active statuses for SQL ANY(...) filters. */
export const ACTIVE_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'assigned',
  'accepted',
  'started',
  'scanned',
  'drop_off_pending',
] as const;

/** Statuses where the driver is already past accept/start and doing physical work. */
export function isPhysicalWorkDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'started' || status === 'scanned' || status === 'drop_off_pending';
}

/** Driver-facing collapsed presentation buckets. */
export type DriverDeliveryPresentationStatus =
  | 'awaiting_accept'
  | 'ready_to_start'
  | 'in_progress'
  | 'completed'
  | 'failed';

export function toDriverDeliveryPresentationStatus(
  status: DeliveryStatus,
): DriverDeliveryPresentationStatus {
  if (status === 'assigned') return 'awaiting_accept';
  if (status === 'accepted') return 'ready_to_start';
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'in_progress';
}

/**
 * Frozen RTS eligibility — uncollected return-to-sender, not customer-return Flow 3.
 * Historical `kind=return` rows remain readable. New legs must not be created.
 */
export function matchesLegacyRtsReturnEligibility(input: {
  parcelStatus: import('./parcel.js').ParcelStatus;
  hasActiveDelivery: boolean;
  hasCompletedOutbound: boolean;
  hasCompletedReturn?: boolean;
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

/** Phase 2: do not create new RTS-as-return livraisons. */
export function canCreateReturnLeg(
  _input: Parameters<typeof matchesLegacyRtsReturnEligibility>[0],
): boolean {
  return false;
}

export function isLegacyRtsDeliveryKind(kind: DeliveryKind | null | undefined): boolean {
  return kind === 'return';
}

export function isCustomerReturnDeliveryKind(kind: DeliveryKind | null | undefined): boolean {
  return kind === 'customer_return';
}

/** Courier-facing history window. Active deliveries are always included. */
export const COURIER_HISTORY_DAYS = 90;
