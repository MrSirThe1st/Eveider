import {
  collectionCredentialShouldActivate,
  collectionSyncChangeType,
  isHardwareSmartLocker,
  type LockerCollectionSyncChangeType,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import { mapLockerCollectionCredential } from '../db/mappers.js';
import type { LockerCollectionCredential } from '../db/types.js';
import { hashLockerCollectionPin } from '../locker-api/pin-hash.js';
import { logLockerEvent } from '../locker-api/log.js';
import { normalizeTrackPhone } from '../tracking/guest-track.js';
import { CommercialRepository } from './commercial.repository.js';
import { LockerAuthorizationError } from '../locker-api/errors.js';

const SYNC_PAGE_SIZE = 200;

export type LockerCollectionSyncChange = {
  type: LockerCollectionSyncChangeType;
  credentialId: string;
  version: number;
  syncSeq: string;
  parcelId: string;
  trackingNumber: string;
  recipientPhoneNormalized: string;
  pinHash: string;
  lockerId: string;
  compartmentId: string | null;
  status: LockerCollectionCredential['status'];
};

export type LockerCollectionSyncPage = {
  cursor: string;
  changes: LockerCollectionSyncChange[];
};

export type OfflineCollectionClaimInput = {
  credentialId: string;
  version: number;
  trackingNumber: string;
  compartmentId: string;
  deviceEventId: string;
  parcelId?: string;
};

export type OfflineCollectionClaim = {
  parcelId: string;
  credentialId: string;
  alreadyClaimed: boolean;
};

function deny(code: ConstructorParameters<typeof LockerAuthorizationError>[0]): never {
  throw new LockerAuthorizationError(code);
}

function bumpSyncSql(): string {
  return `nextval('locker_collection_credential_seq')`;
}

export class CollectionCredentialRepository {
  constructor(private readonly db: Queryable) {}

  async reconcileForParcel(parcelId: string): Promise<LockerCollectionCredential | null> {
    const snapshot = await this.loadParcelSnapshot(parcelId);
    if (!snapshot) {
      await this.revokeLiveForParcel(parcelId);
      return null;
    }

    const collectable =
      snapshot.status === 'ready_for_pickup' &&
      Boolean(snapshot.pin) &&
      Boolean(snapshot.lockerId) &&
      isHardwareSmartLocker(snapshot.lockerType);

    if (!collectable || !snapshot.lockerId || !snapshot.pin) {
      await this.revokeLiveForParcel(parcelId);
      return this.findLiveForParcel(parcelId);
    }

    const decision = await new CommercialRepository(this.db).evaluateRecipientCollection(parcelId);
    const shouldActivate = collectionCredentialShouldActivate(decision);
    const pinHash = hashLockerCollectionPin(snapshot.pin);
    const phone = normalizeTrackPhone(snapshot.recipientPhone);
    const live = await this.findLiveForParcel(parcelId);

    if (live && live.lockerId !== snapshot.lockerId) {
      await this.revokeCredential(live.id);
      return this.insertCredential({
        parcelId,
        lockerId: snapshot.lockerId,
        compartmentId: snapshot.compartmentId,
        trackingNumber: snapshot.trackingNumber,
        recipientPhoneNormalized: phone,
        pinHash,
        activate: shouldActivate,
      });
    }

    if (live && live.pinHash !== pinHash) {
      await this.revokeCredential(live.id);
      return this.insertCredential({
        parcelId,
        lockerId: snapshot.lockerId,
        compartmentId: snapshot.compartmentId,
        trackingNumber: snapshot.trackingNumber,
        recipientPhoneNormalized: phone,
        pinHash,
        activate: shouldActivate,
      });
    }

    if (!live) {
      return this.insertCredential({
        parcelId,
        lockerId: snapshot.lockerId,
        compartmentId: snapshot.compartmentId,
        trackingNumber: snapshot.trackingNumber,
        recipientPhoneNormalized: phone,
        pinHash,
        activate: shouldActivate,
      });
    }

    return this.applyDesiredStatus(live, {
      compartmentId: snapshot.compartmentId,
      trackingNumber: snapshot.trackingNumber,
      recipientPhoneNormalized: phone,
      activate: shouldActivate,
    });
  }

  async consumeForParcel(parcelId: string, deviceEventId?: string | null): Promise<void> {
    await this.db.query(
      `UPDATE locker_collection_credentials
       SET status = 'consumed',
           consumed_at = COALESCE(consumed_at, NOW()),
           collection_device_event_id = COALESCE(collection_device_event_id, $2),
           sync_seq = ${bumpSyncSql()},
           version = version + 1,
           updated_at = NOW()
       WHERE parcel_id = $1
         AND status IN ('pending', 'active')`,
      [parcelId, deviceEventId ?? null],
    );
  }

  async revokeForParcel(parcelId: string): Promise<void> {
    await this.revokeLiveForParcel(parcelId);
  }

  async listChangesSince(lockerId: string, since: string): Promise<LockerCollectionSyncPage> {
    const cursor = parseCursor(since);
    const result = await this.db.query(
      `SELECT *
       FROM locker_collection_credentials
       WHERE locker_id = $1
         AND sync_seq > $2
         AND (
           status = 'active'
           OR (status IN ('consumed', 'revoked') AND activated_at IS NOT NULL)
         )
       ORDER BY sync_seq ASC
       LIMIT $3`,
      [lockerId, cursor, SYNC_PAGE_SIZE],
    );
    const changes: LockerCollectionSyncChange[] = [];
    let last = cursor;
    for (const row of result.rows) {
      const credential = mapLockerCollectionCredential(row);
      const type = collectionSyncChangeType(credential.status, Boolean(credential.activatedAt));
      if (!type) continue;
      const seq = BigInt(credential.syncSeq);
      if (seq > last) last = seq;
      changes.push({
        type,
        credentialId: credential.id,
        version: credential.version,
        syncSeq: credential.syncSeq,
        parcelId: credential.parcelId,
        trackingNumber: credential.trackingNumber,
        recipientPhoneNormalized: credential.recipientPhoneNormalized,
        pinHash: credential.pinHash,
        lockerId: credential.lockerId,
        compartmentId: credential.compartmentId,
        status: credential.status,
      });
    }
    return { cursor: last.toString(), changes };
  }

  /**
   * Bind an offline physical collection to a previously issued credential.
   * Does not invent authorization and does not apply parcel lifecycle.
   */
  async claimOfflineCollection(
    lockerId: string,
    input: OfflineCollectionClaimInput,
  ): Promise<OfflineCollectionClaim> {
    return withTransaction(async (tx) => {
      const repo = new CollectionCredentialRepository(tx);
      return repo.claimOfflineCollectionOn(tx, lockerId, input);
    });
  }

  private async claimOfflineCollectionOn(
    db: Queryable,
    lockerId: string,
    input: OfflineCollectionClaimInput,
  ): Promise<OfflineCollectionClaim> {
    const result = await db.query(
      `SELECT * FROM locker_collection_credentials WHERE id = $1 LIMIT 1 FOR UPDATE`,
      [input.credentialId],
    );
    const row = result.rows[0];
    if (!row) deny('CREDENTIAL_NOT_FOUND');
    const credential = mapLockerCollectionCredential(row);

    if (credential.lockerId !== lockerId) deny('WRONG_LOCKER');
    if (input.parcelId && input.parcelId !== credential.parcelId) deny('SESSION_MISMATCH');
    if (credential.compartmentId !== input.compartmentId) deny('SESSION_MISMATCH');
    if (credential.trackingNumber.trim().toUpperCase() !== input.trackingNumber.trim().toUpperCase()) {
      deny('SESSION_MISMATCH');
    }

    if (
      credential.status === 'consumed' &&
      credential.collectionDeviceEventId === input.deviceEventId
    ) {
      logLockerEvent('offline_collection_replay', {
        lockerId,
        credentialId: credential.id,
        parcelId: credential.parcelId,
        deviceEventId: input.deviceEventId,
      });
      return {
        parcelId: credential.parcelId,
        credentialId: credential.id,
        alreadyClaimed: true,
      };
    }

    if (credential.status === 'consumed') deny('SESSION_MISMATCH');
    if (credential.status !== 'active') deny('CREDENTIAL_NOT_ACTIVE');
    if (credential.version !== input.version) deny('SESSION_MISMATCH');

    try {
      await db.query(
        `UPDATE locker_collection_credentials
         SET status = 'consumed',
             consumed_at = NOW(),
             collection_device_event_id = $2,
             sync_seq = ${bumpSyncSql()},
             version = version + 1,
             updated_at = NOW()
         WHERE id = $1
           AND status = 'active'`,
        [credential.id, input.deviceEventId],
      );
    } catch (err) {
      if (isUniqueViolation(err)) deny('SESSION_MISMATCH');
      throw err;
    }

    logLockerEvent('offline_collection_claimed', {
      lockerId,
      credentialId: credential.id,
      parcelId: credential.parcelId,
      compartmentId: credential.compartmentId,
      deviceEventId: input.deviceEventId,
    });

    return {
      parcelId: credential.parcelId,
      credentialId: credential.id,
      alreadyClaimed: false,
    };
  }

  private async loadParcelSnapshot(parcelId: string): Promise<{
    status: string;
    lockerId: string | null;
    lockerType: string | null;
    compartmentId: string | null;
    trackingNumber: string;
    recipientPhone: string;
    pin: string | null;
  } | null> {
    const result = await this.db.query(
      `SELECT p.status, p.locker_id, p.compartment_id, p.tracking_number, p.recipient_phone,
              l.type AS locker_type, pin.code AS pin
       FROM parcels p
       LEFT JOIN lockers l ON l.id = p.locker_id
       LEFT JOIN pickup_pins pin ON pin.parcel_id = p.id
       WHERE p.id = $1
       LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      status: String(row.status),
      lockerId: row.locker_id == null ? null : String(row.locker_id),
      lockerType: row.locker_type == null ? null : String(row.locker_type),
      compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
      trackingNumber: String(row.tracking_number),
      recipientPhone: String(row.recipient_phone),
      pin: row.pin == null ? null : String(row.pin),
    };
  }

  private async findLiveForParcel(parcelId: string): Promise<LockerCollectionCredential | null> {
    const result = await this.db.query(
      `SELECT * FROM locker_collection_credentials
       WHERE parcel_id = $1 AND status IN ('pending', 'active')
       LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    return row ? mapLockerCollectionCredential(row) : null;
  }

  private async revokeLiveForParcel(parcelId: string): Promise<void> {
    await this.db.query(
      `UPDATE locker_collection_credentials
       SET status = 'revoked',
           revoked_at = COALESCE(revoked_at, NOW()),
           sync_seq = ${bumpSyncSql()},
           version = version + 1,
           updated_at = NOW()
       WHERE parcel_id = $1
         AND status IN ('pending', 'active')`,
      [parcelId],
    );
  }

  private async revokeCredential(id: string): Promise<void> {
    await this.db.query(
      `UPDATE locker_collection_credentials
       SET status = 'revoked',
           revoked_at = COALESCE(revoked_at, NOW()),
           sync_seq = ${bumpSyncSql()},
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1
         AND status IN ('pending', 'active')`,
      [id],
    );
  }

  private async insertCredential(input: {
    parcelId: string;
    lockerId: string;
    compartmentId: string | null;
    trackingNumber: string;
    recipientPhoneNormalized: string;
    pinHash: string;
    activate: boolean;
  }): Promise<LockerCollectionCredential> {
    const result = await this.db.query(
      `INSERT INTO locker_collection_credentials (
         parcel_id, locker_id, compartment_id, tracking_number,
         recipient_phone_normalized, pin_hash, status, version,
         activated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CASE WHEN $7 = 'active' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        input.parcelId,
        input.lockerId,
        input.compartmentId,
        input.trackingNumber,
        input.recipientPhoneNormalized,
        input.pinHash,
        input.activate ? 'active' : 'pending',
      ],
    );
    const credential = mapLockerCollectionCredential(result.rows[0]!);
    logLockerEvent('collection_credential_upserted', {
      parcelId: credential.parcelId,
      lockerId: credential.lockerId,
      credentialId: credential.id,
      status: credential.status,
      version: credential.version,
    });
    return credential;
  }

  private async applyDesiredStatus(
    live: LockerCollectionCredential,
    next: {
      compartmentId: string | null;
      trackingNumber: string;
      recipientPhoneNormalized: string;
      activate: boolean;
    },
  ): Promise<LockerCollectionCredential> {
    const desired = next.activate ? 'active' : 'pending';
    const same =
      live.status === desired &&
      live.compartmentId === next.compartmentId &&
      live.trackingNumber === next.trackingNumber &&
      live.recipientPhoneNormalized === next.recipientPhoneNormalized;
    if (same) return live;

    if (live.status === 'active' && !next.activate) {
      const revoked = await this.db.query(
        `UPDATE locker_collection_credentials
         SET status = 'revoked',
             revoked_at = NOW(),
             sync_seq = ${bumpSyncSql()},
             version = version + 1,
             updated_at = NOW()
         WHERE id = $1 AND status = 'active'
         RETURNING *`,
        [live.id],
      );
      return mapLockerCollectionCredential(revoked.rows[0]!);
    }

    const result = await this.db.query(
      `UPDATE locker_collection_credentials
       SET compartment_id = $2,
           tracking_number = $3,
           recipient_phone_normalized = $4,
           status = $5,
           activated_at = CASE
             WHEN $5 = 'active' THEN COALESCE(activated_at, NOW())
             ELSE activated_at
           END,
           sync_seq = ${bumpSyncSql()},
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1
         AND status IN ('pending', 'active')
       RETURNING *`,
      [
        live.id,
        next.compartmentId,
        next.trackingNumber,
        next.recipientPhoneNormalized,
        desired,
      ],
    );
    const row = result.rows[0];
    return row ? mapLockerCollectionCredential(row) : live;
  }
}

function parseCursor(since: string): bigint {
  const trimmed = since.trim();
  if (!trimmed) return 0n;
  try {
    const value = BigInt(trimmed);
    return value < 0n ? 0n : value;
  } catch {
    return 0n;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505',
  );
}
