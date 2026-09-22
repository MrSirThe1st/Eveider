import type { CompartmentSize } from './locker-layout.js';
import { COMPARTMENT_SIZE_FULL_LABELS } from './locker-layout.js';

export type LockerNetworkSettings = {
  pickupHoldHours: number;
  pickupReminderHours: number;
};

export const DEFAULT_LOCKER_NETWORK_SETTINGS: LockerNetworkSettings = {
  pickupHoldHours: 72,
  pickupReminderHours: 24,
};

/** Catalog labels for global S/M/L (dimensions/weight come later). */
export const NETWORK_SIZE_DEFINITIONS: ReadonlyArray<{
  size: CompartmentSize;
  label: string;
  shortLabel: string;
}> = [
  { size: 'small', label: COMPARTMENT_SIZE_FULL_LABELS.small, shortLabel: 'S' },
  { size: 'medium', label: COMPARTMENT_SIZE_FULL_LABELS.medium, shortLabel: 'M' },
  { size: 'large', label: COMPARTMENT_SIZE_FULL_LABELS.large, shortLabel: 'L' },
];

const SIZE_RANK: Record<CompartmentSize, number> = {
  small: 0,
  medium: 1,
  large: 2,
};

/** An S parcel may use S, M, or L. An L parcel only fits L. */
export function compartmentFitsParcelSize(
  compartmentSize: CompartmentSize,
  parcelSize: CompartmentSize,
): boolean {
  return SIZE_RANK[compartmentSize] >= SIZE_RANK[parcelSize];
}

export type SuggestableCompartment = {
  id: string;
  label: string;
  size: CompartmentSize;
};

/**
 * Suggest the smallest compartment that still fits the parcel.
 * Never blocks — returns null when nothing fits.
 * Courier/operator remains free to pick another compartment.
 */
export function suggestCompartmentForParcelSize(
  compartments: SuggestableCompartment[],
  parcelSize: CompartmentSize,
): SuggestableCompartment | null {
  const matching = compartments.filter((compartment) =>
    compartmentFitsParcelSize(compartment.size, parcelSize),
  );
  if (matching.length === 0) return null;
  return [...matching].sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0] ?? null;
}
