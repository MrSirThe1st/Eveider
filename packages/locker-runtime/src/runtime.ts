import {
  isDepositPhysicallySuccessful,
  isRemovalPhysicallySuccessful,
  type LockerOccupancy,
} from '@eveider/domain';
import { localPinMatches, phonesMatchLocal } from './identity.js';
import type { LocalCollectionCredential, LockerRuntimeSnapshot, PendingPhysicalEvent } from './store.js';

export type LocalValidationInput = {
  lockerId: string;
  phone: string;
  trackingNumber: string;
  pin: string;
};

export type LocalValidationResult =
  | {
      authorized: true;
      credential: LocalCollectionCredential;
      compartmentId: string;
    }
  | { authorized: false; reason: 'INVALID_CREDENTIALS' | 'WRONG_LOCKER' | 'CREDENTIAL_NOT_ACTIVE' };

export function validateLocalRecipientCollection(
  snapshot: LockerRuntimeSnapshot,
  input: LocalValidationInput,
): LocalValidationResult {
  const tracking = input.trackingNumber.trim().toUpperCase();
  const matches = Object.values(snapshot.credentials).filter(
    (credential) => credential.trackingNumber.trim().toUpperCase() === tracking,
  );
  const credential = matches[0];
  if (!credential) return { authorized: false, reason: 'INVALID_CREDENTIALS' };
  if (credential.lockerId !== input.lockerId || credential.lockerId !== snapshot.lockerId) {
    return { authorized: false, reason: 'WRONG_LOCKER' };
  }
  if (credential.status !== 'active') return { authorized: false, reason: 'CREDENTIAL_NOT_ACTIVE' };
  if (!phonesMatchLocal(input.phone, credential.recipientPhoneNormalized)) {
    return { authorized: false, reason: 'INVALID_CREDENTIALS' };
  }
  if (!localPinMatches(input.pin, credential.pinHash)) {
    return { authorized: false, reason: 'INVALID_CREDENTIALS' };
  }
  return { authorized: true, credential, compartmentId: credential.compartmentId };
}

export function consumeLocalCredential(
  snapshot: LockerRuntimeSnapshot,
  credentialId: string,
): LockerRuntimeSnapshot {
  const credential = snapshot.credentials[credentialId];
  if (!credential) return snapshot;
  return {
    ...snapshot,
    credentials: {
      ...snapshot.credentials,
      [credentialId]: { ...credential, status: 'consumed' },
    },
  };
}

export function applySyncChanges(
  snapshot: LockerRuntimeSnapshot,
  page: {
    cursor: string;
    changes: Array<{
      type: 'activate' | 'revoke' | 'consume';
      credentialId: string;
      version: number;
      parcelId: string;
      trackingNumber: string;
      recipientPhoneNormalized: string;
      pinHash: string;
      lockerId: string;
      compartmentId: string | null;
    }>;
  },
): LockerRuntimeSnapshot {
  const credentials = { ...snapshot.credentials };
  for (const change of page.changes) {
    if (change.lockerId !== snapshot.lockerId || !change.compartmentId) continue;
    const existing = credentials[change.credentialId];
    if (existing && change.version < existing.version) continue;
    if (
      existing &&
      change.version === existing.version &&
      change.type === 'activate' &&
      existing.status !== 'active'
    ) {
      continue;
    }
    if (change.type === 'activate') {
      credentials[change.credentialId] = {
        credentialId: change.credentialId,
        version: change.version,
        parcelId: change.parcelId,
        trackingNumber: change.trackingNumber,
        recipientPhoneNormalized: change.recipientPhoneNormalized,
        pinHash: change.pinHash,
        lockerId: change.lockerId,
        compartmentId: change.compartmentId,
        status: 'active',
      };
      continue;
    }
    if (!existing) continue;
    credentials[change.credentialId] = {
      ...existing,
      version: change.version,
      status: change.type === 'revoke' ? 'revoked' : 'consumed',
    };
  }
  return { ...snapshot, credentials, syncCursor: page.cursor };
}

export function stableDeviceEventId(kind: string, key: string): string {
  return `${kind}:${key}`;
}

export function queuePendingEvent(
  snapshot: LockerRuntimeSnapshot,
  event: PendingPhysicalEvent,
): LockerRuntimeSnapshot {
  if (snapshot.pendingEvents.some((item) => item.deviceEventId === event.deviceEventId)) {
    return snapshot;
  }
  return { ...snapshot, pendingEvents: [...snapshot.pendingEvents, event] };
}

export function acknowledgePendingEvent(
  snapshot: LockerRuntimeSnapshot,
  deviceEventId: string,
): LockerRuntimeSnapshot {
  return {
    ...snapshot,
    pendingEvents: snapshot.pendingEvents.filter((item) => item.deviceEventId !== deviceEventId),
  };
}

export function occupancyEventMayMutateParcel(input: {
  occupancy: LockerOccupancy;
  sessionId?: string | null;
  credentialId?: string | null;
}): boolean {
  return Boolean(input.sessionId || input.credentialId);
}

export function depositEvidenceSucceeded(input: {
  doorOpened: boolean;
  doorClosed: boolean;
  occupancy: LockerOccupancy;
  occupancyRequired: boolean;
}): boolean {
  return isDepositPhysicallySuccessful(input);
}

export function removalEvidenceSucceeded(input: {
  doorOpened: boolean;
  doorClosed: boolean;
  occupancy: LockerOccupancy;
  occupancyRequired: boolean;
}): boolean {
  return isRemovalPhysicallySuccessful(input);
}
