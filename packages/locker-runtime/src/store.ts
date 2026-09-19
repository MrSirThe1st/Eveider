import type { LockerOccupancy } from '@eveider/domain';

export type LocalCollectionCredential = {
  credentialId: string;
  version: number;
  parcelId: string;
  trackingNumber: string;
  recipientPhoneNormalized: string;
  pinHash: string;
  lockerId: string;
  compartmentId: string;
  status: 'active' | 'consumed' | 'revoked';
};

export type PendingPhysicalEvent = {
  deviceEventId: string;
  kind: 'session-confirm' | 'session-cancel' | 'recipient-collection';
  payload: Record<string, unknown>;
  createdAt: string;
};

export type LockerRuntimeSnapshot = {
  lockerId: string;
  syncCursor: string;
  credentials: Record<string, LocalCollectionCredential>;
  pendingEvents: PendingPhysicalEvent[];
};

export interface LockerRuntimeStore {
  load(): Promise<LockerRuntimeSnapshot>;
  save(snapshot: LockerRuntimeSnapshot): Promise<void>;
}

export function emptyLockerRuntimeSnapshot(lockerId: string): LockerRuntimeSnapshot {
  return { lockerId, syncCursor: '0', credentials: {}, pendingEvents: [] };
}

export class MemoryLockerRuntimeStore implements LockerRuntimeStore {
  constructor(private snapshot: LockerRuntimeSnapshot) {}

  async load(): Promise<LockerRuntimeSnapshot> {
    return cloneSnapshot(this.snapshot);
  }

  async save(snapshot: LockerRuntimeSnapshot): Promise<void> {
    this.snapshot = cloneSnapshot(snapshot);
  }
}

function cloneSnapshot(snapshot: LockerRuntimeSnapshot): LockerRuntimeSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as LockerRuntimeSnapshot;
}

export type PhysicalEvidence = {
  doorOpened: boolean;
  doorClosed: boolean;
  occupancy: LockerOccupancy;
};

export type LockerHardwareAdapter = {
  occupancyRequired: boolean;
  openCompartment(compartmentId: string): Promise<{ accepted: boolean }>;
  readEvidence(compartmentId: string): Promise<PhysicalEvidence>;
};

export class StubHardwareAdapter implements LockerHardwareAdapter {
  occupancyRequired: boolean;
  private evidence: PhysicalEvidence;

  constructor(
    occupancyRequired = false,
    evidence: PhysicalEvidence = { doorOpened: true, doorClosed: true, occupancy: 'unknown' },
  ) {
    this.occupancyRequired = occupancyRequired;
    this.evidence = evidence;
  }

  setEvidence(evidence: PhysicalEvidence): void {
    this.evidence = evidence;
  }

  async openCompartment(_compartmentId: string): Promise<{ accepted: boolean }> {
    return { accepted: true };
  }

  async readEvidence(_compartmentId: string): Promise<PhysicalEvidence> {
    return this.evidence;
  }
}
