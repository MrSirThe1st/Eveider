export type UserRole = 'customer' | 'courier' | 'business' | 'admin';

export type ParcelStatus =
  | 'created'
  | 'in_transit'
  | 'delivered_to_locker'
  | 'ready_for_pickup'
  | 'collected';

export type BusinessStatus = 'pending' | 'active' | 'suspended' | 'blocked';

const PARCEL_TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  created: ['in_transit'],
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
