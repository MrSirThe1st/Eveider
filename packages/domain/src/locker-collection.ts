import type { RecipientCollectionDecision } from './commercial.js';

export const LOCKER_COLLECTION_CREDENTIAL_STATUSES = [
  'pending',
  'active',
  'consumed',
  'revoked',
] as const;

export type LockerCollectionCredentialStatus =
  (typeof LOCKER_COLLECTION_CREDENTIAL_STATUSES)[number];

export const LOCKER_COLLECTION_SYNC_CHANGE_TYPES = [
  'activate',
  'revoke',
  'consume',
] as const;

export type LockerCollectionSyncChangeType =
  (typeof LOCKER_COLLECTION_SYNC_CHANGE_TYPES)[number];

export const LOCKER_OCCUPANCY_STATES = ['occupied', 'empty', 'unknown'] as const;
export type LockerOccupancy = (typeof LOCKER_OCCUPANCY_STATES)[number];

/** PIN exists server-side; locker may use it only after commercial authorization. */
export function collectionCredentialShouldActivate(
  decision: Pick<RecipientCollectionDecision, 'authorized'>,
): boolean {
  return decision.authorized === true;
}

export function collectionSyncChangeType(
  status: LockerCollectionCredentialStatus,
  wasActivated: boolean,
): LockerCollectionSyncChangeType | null {
  if (status === 'active') return 'activate';
  if (!wasActivated) return null;
  if (status === 'revoked') return 'revoke';
  if (status === 'consumed') return 'consume';
  return null;
}

export function isDepositPhysicallySuccessful(input: {
  doorOpened: boolean;
  doorClosed: boolean;
  occupancy: LockerOccupancy;
  occupancyRequired: boolean;
}): boolean {
  if (!input.doorOpened || !input.doorClosed) return false;
  if (input.occupancyRequired) return input.occupancy === 'occupied';
  return input.occupancy !== 'empty';
}

export function isRemovalPhysicallySuccessful(input: {
  doorOpened: boolean;
  doorClosed: boolean;
  occupancy: LockerOccupancy;
  occupancyRequired: boolean;
}): boolean {
  if (!input.doorOpened || !input.doorClosed) return false;
  if (input.occupancyRequired) return input.occupancy === 'empty';
  return input.occupancy !== 'occupied';
}

export function normalizeLockerPin(pin: string): string {
  return pin.trim();
}
