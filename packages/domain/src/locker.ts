export type LockerStatus = 'active' | 'offline' | 'full' | 'archived';

export type CompartmentStatus = 'available' | 'occupied' | 'reserved';

export const LOCKER_STATUSES: readonly LockerStatus[] = [
  'active',
  'offline',
  'full',
  'archived',
] as const;

export const ACTIVE_LOCKER_STATUSES: readonly LockerStatus[] = ['active', 'offline', 'full'] as const;

export const COMPARTMENT_STATUSES: readonly CompartmentStatus[] = [
  'available',
  'occupied',
  'reserved',
] as const;

const LOCKER_TRANSITIONS: Record<LockerStatus, readonly LockerStatus[]> = {
  active: ['offline', 'full', 'archived'],
  offline: ['active', 'archived'],
  full: ['active', 'archived'],
  archived: ['active', 'offline'],
};

const COMPARTMENT_TRANSITIONS: Record<CompartmentStatus, readonly CompartmentStatus[]> = {
  available: ['reserved', 'occupied'],
  reserved: ['occupied', 'available'],
  occupied: ['available'],
};

export function canTransitionLocker(from: LockerStatus, to: LockerStatus): boolean {
  return LOCKER_TRANSITIONS[from].includes(to);
}

export function transitionLocker(from: LockerStatus, to: LockerStatus): LockerStatus {
  if (!canTransitionLocker(from, to)) {
    throw new Error(`Invalid locker transition: ${from} → ${to}`);
  }
  return to;
}

export function canTransitionCompartment(
  from: CompartmentStatus,
  to: CompartmentStatus,
): boolean {
  return COMPARTMENT_TRANSITIONS[from].includes(to);
}

export function transitionCompartment(
  from: CompartmentStatus,
  to: CompartmentStatus,
): CompartmentStatus {
  if (!canTransitionCompartment(from, to)) {
    throw new Error(`Invalid compartment transition: ${from} → ${to}`);
  }
  return to;
}

export function canAcceptDropOff(lockerStatus: LockerStatus): boolean {
  return lockerStatus === 'active';
}

export function canAssignCompartment(status: CompartmentStatus): boolean {
  return status === 'available' || status === 'reserved';
}

export function isLockerSelectable(status: LockerStatus): boolean {
  return status === 'active';
}
