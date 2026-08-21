export type LockerStatus = 'active' | 'offline' | 'full' | 'archived';

export type LockerType = 'SMART_LOCKER' | 'PARTNER_POINT' | 'RESIDENTIAL_LOCKER';

export type CommissionType = 'fixed' | 'percent';

export type CompartmentStatus = 'available' | 'occupied' | 'reserved';

/** Parcel statuses that occupy a soft-capacity Eveider Point once assigned. */
export const OCCUPYING_PARCEL_STATUSES = [
  'created',
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
] as const;

export const LOCKER_STATUSES: readonly LockerStatus[] = [
  'active',
  'offline',
  'full',
  'archived',
] as const;

export const LOCKER_TYPES: readonly LockerType[] = [
  'SMART_LOCKER',
  'PARTNER_POINT',
  'RESIDENTIAL_LOCKER',
] as const;

export const SOFT_CAPACITY_LOCKER_TYPES: readonly LockerType[] = [
  'PARTNER_POINT',
  'RESIDENTIAL_LOCKER',
] as const;

export const COMMISSION_TYPES: readonly CommissionType[] = ['fixed', 'percent'] as const;

export const ACTIVE_LOCKER_STATUSES: readonly LockerStatus[] = ['active', 'offline', 'full'] as const;

export const COMPARTMENT_STATUSES: readonly CompartmentStatus[] = [
  'available',
  'occupied',
  'reserved',
] as const;

export function usesCompartmentGrid(type: LockerType): boolean {
  return type === 'SMART_LOCKER';
}

export function usesSoftCapacity(type: LockerType): boolean {
  return type === 'PARTNER_POINT' || type === 'RESIDENTIAL_LOCKER';
}

export function softCapacityRemaining(maxCapacity: number, occupyingCount: number): number {
  return Math.max(0, maxCapacity - occupyingCount);
}

export function isSoftCapacityFull(maxCapacity: number, occupyingCount: number): boolean {
  return occupyingCount >= maxCapacity;
}

export function hasPointAvailability(input: {
  type: LockerType;
  status: LockerStatus;
  availableCompartments: number;
  maxCapacity: number | null;
  occupyingCount: number;
}): boolean {
  if (!isLockerSelectable(input.status)) return false;
  if (usesCompartmentGrid(input.type)) {
    return input.availableCompartments > 0;
  }
  if (input.maxCapacity == null) return false;
  return !isSoftCapacityFull(input.maxCapacity, input.occupyingCount);
}

export function availableSlots(input: {
  type: LockerType;
  availableCompartments: number;
  maxCapacity: number | null;
  occupyingCount: number;
}): number {
  if (usesCompartmentGrid(input.type)) {
    return input.availableCompartments;
  }
  if (input.maxCapacity == null) return 0;
  return softCapacityRemaining(input.maxCapacity, input.occupyingCount);
}

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

const LOCKER_NETWORK_PREFIX: Record<LockerType, string> = {
  SMART_LOCKER: 'Casier',
  PARTNER_POINT: 'Point partenaire',
  RESIDENTIAL_LOCKER: 'Point résidentiel',
};

/** Business-facing name, e.g. "Casier — Gombe". */
export function lockerNetworkLabel(type: LockerType, name: string): string {
  return `${LOCKER_NETWORK_PREFIX[type]} — ${name}`;
}

export function lockerNetworkCapacity(input: {
  type: LockerType;
  compartmentTotal?: number | null;
  maxCapacity?: number | null;
  rows?: number | null;
  columns?: number | null;
}): number {
  if (usesCompartmentGrid(input.type)) {
    if (input.compartmentTotal != null && input.compartmentTotal > 0) {
      return input.compartmentTotal;
    }
    return (input.rows ?? 0) * (input.columns ?? 0);
  }
  return input.maxCapacity ?? 0;
}

export function lockerAvailableLabel(input: {
  type: LockerType;
  availableSlots: number;
}): string {
  const n = Math.max(0, input.availableSlots);
  if (usesCompartmentGrid(input.type)) {
    if (n === 0) return 'Aucun compartiment disponible';
    if (n === 1) return '1 compartiment disponible';
    return `${n} compartiments disponibles`;
  }
  if (n === 0) return 'Aucune place disponible';
  if (n === 1) return '1 place disponible';
  return `${n} places disponibles`;
}

/** Display status: treat an active locker with no remaining slots as full. */
export function lockerOperatingStatus(input: {
  status: LockerStatus;
  availableSlots: number;
}): LockerStatus {
  if (input.status !== 'active') return input.status;
  if (input.availableSlots <= 0) return 'full';
  return 'active';
}
