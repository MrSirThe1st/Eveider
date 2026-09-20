import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Queryable } from '../db/pool.js';
import { hashLockerCollectionPin } from '../locker-api/pin-hash.js';
import {
  createSqlMatchMock,
  lockerCollectionCredentialRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { CollectionCredentialRepository } from './collection-credential.repository.js';
import { LockerAuthorizationError } from '../locker-api/errors.js';

const txDb: { current: Queryable | null } = { current: null };

vi.mock('../db/pool.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/pool.js')>();
  return {
    ...actual,
    withTransaction: vi.fn(async <T>(fn: (client: Queryable) => Promise<T>) => {
      if (!txDb.current) throw new Error('Test db not set for withTransaction');
      return fn(txDb.current);
    }),
  };
});

const pinHash = hashLockerCollectionPin('482913');

function recipientChargeRow(amount: number) {
  return {
    id: 'charge-1',
    parcel_id: 'parcel-1',
    business_id: 'biz-1',
    kind: 'outbound_delivery',
    status: 'owed',
    payer: 'recipient',
    pricing_zone_id: 'zone-1',
    amount,
    currency: 'CDF',
    unit_rate: null,
    quantity: null,
    period_started_at: null,
    period_ended_at: null,
    locked_at: new Date('2026-01-15T12:00:00.000Z'),
    created_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
  };
}

describe('CollectionCredentialRepository', () => {
  let repo: CollectionCredentialRepository;
  let db: Queryable;

  function setup(resolve: (sql: string, values?: unknown[]) => ReturnType<typeof lockerCollectionCredentialRow> | Record<string, unknown> | Record<string, unknown>[] | null) {
    db = createSqlMatchMock((sql, values) => resolve(sql, values));
    txDb.current = db;
    repo = new CollectionCredentialRepository(db);
  }

  beforeEach(() => {
    setup(() => null);
  });

  describe('activation', () => {
    it('keeps a canonical unpaid fee as pending and omits it from sync', async () => {
      const inserts: unknown[][] = [];
      setup((sql, values) => {
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'pickup_pins')) {
          return {
            status: 'ready_for_pickup',
            locker_id: 'locker-1',
            locker_type: 'SMART_LOCKER',
            compartment_id: 'comp-1',
            tracking_number: 'EVD26TEST0001A',
            recipient_phone: '+243000000000',
            pin: '482913',
          };
        }
        if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
          return {
            status: 'ready_for_pickup',
            pickup_type: 'courier_pickup',
            commercial_model: 'canonical',
            payment_responsibility: 'receiver_pays',
          };
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) return recipientChargeRow(1500);
        if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
        if (sqlIncludes(sql, 'status IN (\'pending\', \'active\')')) return null;
        if (sqlIncludes(sql, 'INSERT INTO locker_collection_credentials')) {
          inserts.push(values ?? []);
          return lockerCollectionCredentialRow({ pin_hash: pinHash, status: 'pending' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });

      const credential = await repo.reconcileForParcel('parcel-1');
      expect(credential?.status).toBe('pending');
      expect(inserts[0]?.[6]).toBe('pending');
      expect(inserts[0]?.[7]).toBe(false);

      setup((sql, values) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials') && sqlIncludes(sql, 'sync_seq')) {
          expect(values?.[0]).toBe('locker-1');
          return lockerCollectionCredentialRow({ status: 'pending', pin_hash: pinHash, sync_seq: '11' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const page = await repo.listChangesSince('locker-1', '0');
      expect(page.changes).toEqual([]);
    });

    it('activates after commercial authorization and publishes the change', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'pickup_pins')) {
          return {
            status: 'ready_for_pickup',
            locker_id: 'locker-1',
            locker_type: 'SMART_LOCKER',
            compartment_id: 'comp-1',
            tracking_number: 'EVD26TEST0001A',
            recipient_phone: '+243000000000',
            pin: '482913',
          };
        }
        if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
          return {
            status: 'ready_for_pickup',
            pickup_type: 'courier_pickup',
            commercial_model: 'canonical',
            payment_responsibility: 'receiver_pays',
          };
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) return recipientChargeRow(1500);
        if (sqlIncludes(sql, 'FROM parcel_payments')) return { id: 'pay-1' };
        if (sqlIncludes(sql, 'UPDATE locker_collection_credentials') && sqlIncludes(sql, 'status = $5')) {
          return lockerCollectionCredentialRow({
            status: 'active',
            pin_hash: pinHash,
            activated_at: new Date(),
            version: 2,
            sync_seq: '12',
          });
        }
        if (sqlIncludes(sql, 'status IN (\'pending\', \'active\')')) {
          return lockerCollectionCredentialRow({ status: 'pending', pin_hash: pinHash });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const credential = await repo.reconcileForParcel('parcel-1');
      expect(credential?.status).toBe('active');
    });

    it('activates a zero-fee canonical parcel immediately', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'pickup_pins')) {
          return {
            status: 'ready_for_pickup',
            locker_id: 'locker-1',
            locker_type: 'SMART_LOCKER',
            compartment_id: 'comp-1',
            tracking_number: 'EVD26TEST0001A',
            recipient_phone: '+243000000000',
            pin: '482913',
          };
        }
        if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
          return {
            status: 'ready_for_pickup',
            pickup_type: 'courier_pickup',
            commercial_model: 'canonical',
            payment_responsibility: 'receiver_pays',
          };
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) return recipientChargeRow(0);
        if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
        if (sqlIncludes(sql, 'status IN (\'pending\', \'active\')')) return null;
        if (sqlIncludes(sql, 'INSERT INTO locker_collection_credentials')) {
          return lockerCollectionCredentialRow({
            status: 'active',
            pin_hash: pinHash,
            activated_at: new Date(),
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const credential = await repo.reconcileForParcel('parcel-1');
      expect(credential?.status).toBe('active');
    });

    it('does not activate when the canonical charge is missing', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'pickup_pins')) {
          return {
            status: 'ready_for_pickup',
            locker_id: 'locker-1',
            locker_type: 'SMART_LOCKER',
            compartment_id: 'comp-1',
            tracking_number: 'EVD26TEST0001A',
            recipient_phone: '+243000000000',
            pin: '482913',
          };
        }
        if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
          return {
            status: 'ready_for_pickup',
            pickup_type: 'courier_pickup',
            commercial_model: 'canonical',
            payment_responsibility: 'receiver_pays',
          };
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) return null;
        if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
        if (sqlIncludes(sql, 'status IN (\'pending\', \'active\')')) return null;
        if (sqlIncludes(sql, 'INSERT INTO locker_collection_credentials')) {
          return lockerCollectionCredentialRow({ status: 'pending', pin_hash: pinHash });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const credential = await repo.reconcileForParcel('parcel-1');
      expect(credential?.status).toBe('pending');
    });
  });

  describe('sync isolation', () => {
    it('only returns credentials for the authenticated locker', async () => {
      setup((sql, values) => {
        expect(values?.[0]).toBe('locker-1');
        if (sqlIncludes(sql, 'locker_id = $1')) {
          return lockerCollectionCredentialRow({
            status: 'active',
            activated_at: new Date(),
            pin_hash: pinHash,
            sync_seq: '20',
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const page = await repo.listChangesSince('locker-1', '10');
      expect(page.cursor).toBe('20');
      expect(page.changes).toHaveLength(1);
      expect(page.changes[0]?.type).toBe('activate');
      expect(page.changes[0]?.lockerId).toBe('locker-1');
    });
  });

  describe('offline collection claim', () => {
    const input = {
      credentialId: 'cred-1',
      version: 1,
      trackingNumber: 'EVD26TEST0001A',
      compartmentId: 'comp-1',
      deviceEventId: 'evt-1',
    };

    it('refuses a locker that does not own the credential', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({
            locker_id: 'locker-2',
            status: 'active',
            activated_at: new Date(),
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.claimOfflineCollection('locker-1', input)).rejects.toMatchObject({
        code: 'WRONG_LOCKER',
      });
    });

    it('refuses a pending unsynchronized credential', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({ status: 'pending' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.claimOfflineCollection('locker-1', input)).rejects.toBeInstanceOf(
        LockerAuthorizationError,
      );
      await expect(repo.claimOfflineCollection('locker-1', input)).rejects.toMatchObject({
        code: 'CREDENTIAL_NOT_ACTIVE',
      });
    });

    it('refuses a revoked credential', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({
            status: 'revoked',
            activated_at: new Date(),
            revoked_at: new Date(),
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.claimOfflineCollection('locker-1', input)).rejects.toMatchObject({
        code: 'CREDENTIAL_NOT_ACTIVE',
      });
    });

    it('refuses a mismatched compartment', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({
            status: 'active',
            activated_at: new Date(),
            compartment_id: 'comp-9',
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.claimOfflineCollection('locker-1', input)).rejects.toMatchObject({
        code: 'SESSION_MISMATCH',
      });
    });

    it('replays the same deviceEventId without consuming twice', async () => {
      const updates: string[] = [];
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({
            status: 'consumed',
            activated_at: new Date(),
            consumed_at: new Date(),
            collection_device_event_id: 'evt-1',
          });
        }
        if (sqlIncludes(sql, "status = 'consumed'")) {
          updates.push(sql);
          return null;
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const claim = await repo.claimOfflineCollection('locker-1', input);
      expect(claim.alreadyClaimed).toBe(true);
      expect(updates).toHaveLength(0);
    });

    it('consumes an active credential bound to this locker', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FROM locker_collection_credentials WHERE id')) {
          return lockerCollectionCredentialRow({
            status: 'active',
            activated_at: new Date(),
            pin_hash: pinHash,
          });
        }
        if (sqlIncludes(sql, "status = 'consumed'")) return null;
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const claim = await repo.claimOfflineCollection('locker-1', input);
      expect(claim).toEqual({
        parcelId: 'parcel-1',
        credentialId: 'cred-1',
        alreadyClaimed: false,
      });
    });
  });
});
