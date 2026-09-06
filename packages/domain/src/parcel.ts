/** Persisted parcel lifecycle. Business Colis location is derived — see parcel-location.ts. */
export type ParcelStatus =
  | 'created'
  | 'in_transit'
  | 'delivered_to_locker'
  | 'ready_for_pickup'
  | 'collected';

export const PARCEL_STATUSES: readonly ParcelStatus[] = [
  'created',
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
  'collected',
] as const;

const PARCEL_TRANSITIONS: Record<ParcelStatus, readonly ParcelStatus[]> = {
  /** Merchant drop-off can skip courier custody and go straight to the locker. */
  created: ['in_transit', 'delivered_to_locker'],
  in_transit: ['delivered_to_locker'],
  delivered_to_locker: ['ready_for_pickup'],
  ready_for_pickup: ['collected'],
  collected: [],
};

export function canTransitionParcel(from: ParcelStatus, to: ParcelStatus): boolean {
  return PARCEL_TRANSITIONS[from].includes(to);
}

export function transitionParcel(from: ParcelStatus, to: ParcelStatus): ParcelStatus {
  if (!canTransitionParcel(from, to)) {
    throw new Error(`Invalid parcel transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalParcelStatus(status: ParcelStatus): boolean {
  return status === 'collected';
}
