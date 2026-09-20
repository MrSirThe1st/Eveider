import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashLocalCollectionPin } from './identity.js';
import {
  executeOnlineLockerAction,
  type OnlineActionClient,
} from './online.js';
import {
  acknowledgePendingEvent,
  applySyncChanges,
  consumeLocalCredential,
  occupancyEventMayMutateParcel,
  queuePendingEvent,
  stableDeviceEventId,
  validateLocalRecipientCollection,
} from './runtime.js';
import {
  FileLockerRuntimeStore,
  MemoryLockerRuntimeStore,
  emptyLockerRuntimeSnapshot,
} from './store.js';

const pinHash = hashLocalCollectionPin('482913');

function activeCredential() {
  return {
    credentialId: 'cred-1',
    version: 1,
    parcelId: 'parcel-1',
    trackingNumber: 'EVD26TEST0001A',
    recipientPhoneNormalized: '243000000000',
    pinHash,
    lockerId: 'locker-1',
    compartmentId: 'comp-1',
    status: 'active' as const,
  };
}

describe('local recipient validation', () => {
  it('returns the exact compartment for a matching active credential', () => {
    const snapshot = {
      ...emptyLockerRuntimeSnapshot('locker-1'),
      credentials: { 'cred-1': activeCredential() },
    };
    const result = validateLocalRecipientCollection(snapshot, {
      lockerId: 'locker-1',
      phone: '+243000000000',
      trackingNumber: 'EVD26TEST0001A',
      pin: '482913',
    });
    expect(result).toMatchObject({ authorized: true, compartmentId: 'comp-1' });
  });

  it('rejects wrong phone, tracking, PIN, locker, and consumed credentials', () => {
    const snapshot = {
      ...emptyLockerRuntimeSnapshot('locker-1'),
      credentials: { 'cred-1': activeCredential() },
    };
    expect(
      validateLocalRecipientCollection(snapshot, {
        lockerId: 'locker-1',
        phone: '+243999999999',
        trackingNumber: 'EVD26TEST0001A',
        pin: '482913',
      }).authorized,
    ).toBe(false);
    expect(
      validateLocalRecipientCollection(snapshot, {
        lockerId: 'locker-1',
        phone: '+243000000000',
        trackingNumber: 'WRONG',
        pin: '482913',
      }).authorized,
    ).toBe(false);
    expect(
      validateLocalRecipientCollection(snapshot, {
        lockerId: 'locker-1',
        phone: '+243000000000',
        trackingNumber: 'EVD26TEST0001A',
        pin: '000000',
      }).authorized,
    ).toBe(false);
    expect(
      validateLocalRecipientCollection(snapshot, {
        lockerId: 'locker-2',
        phone: '+243000000000',
        trackingNumber: 'EVD26TEST0001A',
        pin: '482913',
      }).authorized,
    ).toBe(false);

    const consumed = consumeLocalCredential(snapshot, 'cred-1');
    expect(
      validateLocalRecipientCollection(consumed, {
        lockerId: 'locker-1',
        phone: '+243000000000',
        trackingNumber: 'EVD26TEST0001A',
        pin: '482913',
      }),
    ).toMatchObject({ authorized: false, reason: 'CREDENTIAL_NOT_ACTIVE' });
  });

  it('applies revoke from sync so the credential cannot open a door', () => {
    const snapshot = applySyncChanges(emptyLockerRuntimeSnapshot('locker-1'), {
      cursor: '12',
      changes: [
        {
          type: 'activate',
          credentialId: 'cred-1',
          version: 1,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
      ],
    });
    const revoked = applySyncChanges(snapshot, {
      cursor: '13',
      changes: [
        {
          type: 'revoke',
          credentialId: 'cred-1',
          version: 2,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
      ],
    });
    expect(revoked.syncCursor).toBe('13');
    expect(
      validateLocalRecipientCollection(revoked, {
        lockerId: 'locker-1',
        phone: '+243000000000',
        trackingNumber: 'EVD26TEST0001A',
        pin: '482913',
      }).authorized,
    ).toBe(false);
  });
});

describe('outbox and restart', () => {
  it('keeps the same deviceEventId across retries and restart', async () => {
    const store = new MemoryLockerRuntimeStore(emptyLockerRuntimeSnapshot('locker-1'));
    const deviceEventId = stableDeviceEventId('recipient-collection', 'cred-1');
    let snapshot = await store.load();
    snapshot = consumeLocalCredential(
      {
        ...snapshot,
        credentials: { 'cred-1': activeCredential() },
      },
      'cred-1',
    );
    snapshot = queuePendingEvent(snapshot, {
      deviceEventId,
      kind: 'recipient-collection',
      payload: { credentialId: 'cred-1', version: 1 },
      createdAt: new Date().toISOString(),
    });
    snapshot = queuePendingEvent(snapshot, {
      deviceEventId,
      kind: 'recipient-collection',
      payload: { credentialId: 'cred-1', version: 1 },
      createdAt: new Date().toISOString(),
    });
    await store.save(snapshot);

    const recovered = await store.load();
    expect(recovered.credentials['cred-1']?.status).toBe('consumed');
    expect(recovered.pendingEvents).toHaveLength(1);
    expect(recovered.pendingEvents[0]?.deviceEventId).toBe(deviceEventId);

    const cleared = acknowledgePendingEvent(recovered, deviceEventId);
    expect(cleared.pendingEvents).toHaveLength(0);
    expect(cleared.credentials['cred-1']?.status).toBe('consumed');
  });

  it('does not replay an older activate over a consumed credential', () => {
    const snapshot = applySyncChanges(emptyLockerRuntimeSnapshot('locker-1'), {
      cursor: '20',
      changes: [
        {
          type: 'activate',
          credentialId: 'cred-1',
          version: 2,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
        {
          type: 'consume',
          credentialId: 'cred-1',
          version: 3,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
      ],
    });
    const replayed = applySyncChanges(snapshot, {
      cursor: '21',
      changes: [
        {
          type: 'activate',
          credentialId: 'cred-1',
          version: 2,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
      ],
    });
    expect(replayed.credentials['cred-1']?.status).toBe('consumed');
    expect(replayed.syncCursor).toBe('21');
  });

  it('does not treat an uncorrelated occupancy change as collection', () => {
    expect(
      occupancyEventMayMutateParcel({ occupancy: 'empty', sessionId: null, credentialId: null }),
    ).toBe(false);
    expect(
      occupancyEventMayMutateParcel({ occupancy: 'empty', credentialId: 'cred-1' }),
    ).toBe(true);
  });
});

describe('online fail-closed', () => {
  it('does not open a door when Eveider cannot authorize', async () => {
    const client: OnlineActionClient = {
      authorize: async () => ({ ok: false, code: 'LOCKER_UNAVAILABLE' }),
      confirm: async () => true,
      cancel: async () => true,
      reportRecipientCollection: async () => true,
    };
    const opened: string[] = [];
    const result = await executeOnlineLockerAction({
      client,
      authorizeBody: { action: 'deposit' },
      occupancyRequired: false,
      open: async (id) => {
        opened.push(id);
        return { accepted: true };
      },
      evidence: async () => ({ doorOpened: true, doorClosed: true, occupancy: 'occupied' }),
      success: () => true,
    });
    expect(result.opened).toBe(false);
    expect(opened).toHaveLength(0);
  });

  it('queues confirm with a stable deviceEventId when the backend is unreachable after physical success', async () => {
    const client: OnlineActionClient = {
      authorize: async () => ({ ok: true, sessionId: 'session-1', compartmentId: 'comp-1' }),
      confirm: async () => false,
      cancel: async () => true,
      reportRecipientCollection: async () => true,
    };
    const result = await executeOnlineLockerAction({
      client,
      authorizeBody: { action: 'deposit' },
      occupancyRequired: true,
      open: async () => ({ accepted: true }),
      evidence: async () => ({ doorOpened: true, doorClosed: true, occupancy: 'occupied' }),
      success: (evidence) =>
        evidence.doorOpened && evidence.doorClosed && evidence.occupancy === 'occupied',
    });
    expect(result).toMatchObject({
      opened: true,
      confirmed: false,
      queued: true,
      deviceEventId: 'session-confirm:session-1',
    });
  });

  it('does not confirm when physical evidence is incomplete', async () => {
    let confirmCalls = 0;
    const client: OnlineActionClient = {
      authorize: async () => ({ ok: true, sessionId: 'session-2', compartmentId: 'comp-1' }),
      confirm: async () => {
        confirmCalls += 1;
        return true;
      },
      cancel: async () => true,
      reportRecipientCollection: async () => true,
    };
    const result = await executeOnlineLockerAction({
      client,
      authorizeBody: { action: 'deposit' },
      occupancyRequired: true,
      open: async () => ({ accepted: true }),
      evidence: async () => ({ doorOpened: true, doorClosed: false, occupancy: 'unknown' }),
      success: (evidence) =>
        evidence.doorOpened && evidence.doorClosed && evidence.occupancy === 'occupied',
    });
    expect(result).toMatchObject({ opened: true, confirmed: false, queued: false });
    expect(confirmCalls).toBe(0);
  });

  it('retries a queued confirm with the original deviceEventId after restart', async () => {
    const tmp = join(tmpdir(), `eveider-runtime-${Date.now()}.json`);
    const store = new FileLockerRuntimeStore(tmp, 'locker-1');
    const deviceEventId = stableDeviceEventId('session-confirm', 'session-1');
    let snapshot = await store.load();
    snapshot = queuePendingEvent(snapshot, {
      deviceEventId,
      kind: 'session-confirm',
      payload: { sessionId: 'session-1' },
      createdAt: new Date().toISOString(),
    });
    snapshot = applySyncChanges(snapshot, {
      cursor: '9',
      changes: [
        {
          type: 'activate',
          credentialId: 'cred-1',
          version: 1,
          parcelId: 'parcel-1',
          trackingNumber: 'EVD26TEST0001A',
          recipientPhoneNormalized: '243000000000',
          pinHash,
          lockerId: 'locker-1',
          compartmentId: 'comp-1',
        },
      ],
    });
    await store.save(snapshot);

    const recovered = await new FileLockerRuntimeStore(tmp, 'locker-1').load();
    expect(recovered.syncCursor).toBe('9');
    expect(recovered.pendingEvents[0]?.deviceEventId).toBe(deviceEventId);
    expect(recovered.credentials['cred-1']?.status).toBe('active');

    const consumed = consumeLocalCredential(recovered, 'cred-1');
    expect(
      validateLocalRecipientCollection(consumed, {
        lockerId: 'locker-1',
        phone: '+243000000000',
        trackingNumber: 'EVD26TEST0001A',
        pin: '482913',
      }).authorized,
    ).toBe(false);

    const acked = acknowledgePendingEvent(consumed, deviceEventId);
    await store.save(acked);
    const afterAck = await store.load();
    expect(afterAck.pendingEvents).toHaveLength(0);
    expect(afterAck.credentials['cred-1']?.status).toBe('consumed');
  });
});
