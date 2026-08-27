import type { CompartmentSize } from './locker-layout.js';
import { COMPARTMENT_SIZE_FULL_LABELS } from './locker-layout.js';

/** How parcel S/M/L maps onto available compartments (suggestion only). */
export type SizeMatchingMode = 'exact' | 'exact_or_larger';

/** Which available matching compartment to prefer when suggesting. */
export type AssignmentStrategy = 'smallest_fit' | 'first_available' | 'preferred_size';

export type LockerNetworkSettings = {
  sizeMatchingMode: SizeMatchingMode;
  assignmentStrategy: AssignmentStrategy;
  pickupHoldHours: number;
  pickupReminderHours: number;
};

export const SIZE_MATCHING_MODES: readonly SizeMatchingMode[] = [
  'exact',
  'exact_or_larger',
] as const;

export const ASSIGNMENT_STRATEGIES: readonly AssignmentStrategy[] = [
  'smallest_fit',
  'first_available',
  'preferred_size',
] as const;

export const SIZE_MATCHING_MODE_LABELS: Record<SizeMatchingMode, string> = {
  exact: 'Taille exacte uniquement',
  exact_or_larger: 'Taille exacte ou supérieure',
};

export const ASSIGNMENT_STRATEGY_LABELS: Record<AssignmentStrategy, string> = {
  smallest_fit: 'Plus petit compartiment adapté',
  first_available: 'Premier compartiment disponible',
  preferred_size: 'Taille demandée en priorité',
};

export const DEFAULT_LOCKER_NETWORK_SETTINGS: LockerNetworkSettings = {
  sizeMatchingMode: 'exact_or_larger',
  assignmentStrategy: 'smallest_fit',
  pickupHoldHours: 48,
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

export function compartmentFitsParcelSize(
  compartmentSize: CompartmentSize,
  parcelSize: CompartmentSize,
  mode: SizeMatchingMode = DEFAULT_LOCKER_NETWORK_SETTINGS.sizeMatchingMode,
): boolean {
  if (mode === 'exact') return compartmentSize === parcelSize;
  return SIZE_RANK[compartmentSize] >= SIZE_RANK[parcelSize];
}

export type SuggestableCompartment = {
  id: string;
  label: string;
  size: CompartmentSize;
};

/**
 * Suggest a compartment for a parcel size. Never blocks — returns null when nothing fits.
 * Courier/operator remains free to pick another compartment.
 */
export function suggestCompartmentForParcelSize(
  compartments: SuggestableCompartment[],
  parcelSize: CompartmentSize,
  settings: Pick<LockerNetworkSettings, 'sizeMatchingMode' | 'assignmentStrategy'> = DEFAULT_LOCKER_NETWORK_SETTINGS,
): SuggestableCompartment | null {
  const matching = compartments.filter((compartment) =>
    compartmentFitsParcelSize(compartment.size, parcelSize, settings.sizeMatchingMode),
  );
  if (matching.length === 0) return null;

  if (settings.assignmentStrategy === 'first_available') {
    return matching[0] ?? null;
  }

  if (settings.assignmentStrategy === 'preferred_size') {
    const preferred = matching.find((compartment) => compartment.size === parcelSize);
    if (preferred) return preferred;
  }

  return [...matching].sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0] ?? null;
}
