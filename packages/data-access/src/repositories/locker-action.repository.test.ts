import { createDataAccessContext } from '../context.js';
import {
  LockerActionRepository,
  LockerAuthorizationError,
} from './locker-action.repository.js';
import type { Queryable } from '../db/pool.js';
import {
  businessRow,
  compartmentRow,
  createSqlMatchMock,
  deliveryRow,
  lockerActionSessionRow,
  lockerRow,
  parcelEventRow,
  parcelReturnRow,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const tracking = 'EVD26TEST0001A';

function lockerTrackingRow(overrides: Record<string, unknown> = {}) {
  return {
    ...parcelRow({
      tracking_number: tracking,
      status: 'in_transit',
      pickup_type: 'courier_pickup',
      package_size: 'medium',
      locker_id: 'locker-1',
      ...overrides,
    }),
    locker_type: 'SMART_LOCKER',
    locker_status: 'active',
  };
}

function eveiderDriverRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'courier-1',
    contractor_type: 'eveider',
    status: 'active',
    is_blocked: false,
    deactivated_at: null,
    deleted_at: null,
    ...overrides,
  };
}

async function expectDenial(
  repo: LockerActionRepository,
  input: Parameters<LockerActionRepository['authorize']>[1],
  code: string,
) {
  await expect(repo.authorize('locker-1', input)).rejects.toMatchObject({
    name: 'LockerAuthorizationError',
    code,
  });
}

describe('LockerActionRepository', () => {
  let repo: LockerActionRepository;

  function setup(resolve: (sql: string, values?: unknown[]) => ReturnType<typeof parcelRow> | Record<string, unknown> | Record<string, unknown>[] | null) {
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'INSERT INTO parcel_events')) return parcelEventRow();
      return resolve(sql, values);
    });
    txDb.current = db;
    repo = new LockerActionRepository(db);
    return db;
  }

  beforeEach(() => {
    txDb.current = null;
  });

  describe('Flow 1 deposit', () => {
    const input = {
      action: 'deposit' as const,
      actorType: 'eveider_driver' as const,
      driverId: '11111111-1111-4111-8111-111111111111',
      trackingNumber: tracking,
    };

    it('authorizes, reserves a compatible compartment, and leaves the parcel IN_TRANSIT', async () => {
      const parcelUpdates: string[] = [];
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) {
          return lockerRow({ type: 'SMART_LOCKER', status: 'active' });
        }
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow();
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) return eveiderDriverRow();
        if (sqlIncludes(sql, 'FROM deliveries') && sqlIncludes(sql, 'kind')) {
          return deliveryRow({ kind: 'outbound', status: 'assigned', driver_id: 'courier-1' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'status = \'authorized\'')) {
          return null;
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE locker_id') && sqlIncludes(sql, 'available')) {
          return [
            compartmentRow({ id: 'comp-small', label: 'A1', size: 'small', status: 'available' }),
            compartmentRow({ id: 'comp-1', label: 'B1', size: 'medium', status: 'available' }),
            compartmentRow({ id: 'comp-large', label: 'C1', size: 'large', status: 'available' }),
          ];
        }
        if (sqlIncludes(sql, 'SET status = \'reserved\'')) {
          return compartmentRow({ id: 'comp-1', label: 'B1', size: 'medium', status: 'reserved' });
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({
            action: 'deposit',
            actor_type: 'eveider_driver',
            compartment_id: 'comp-1',
          });
        }
        if (sqlIncludes(sql, 'UPDATE parcels')) {
          parcelUpdates.push(sql);
          return lockerTrackingRow();
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });

      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
      expect(result.compartment?.id).toBe('comp-1');
      expect(result.parcelId).toBe('parcel-1');
      expect(parcelUpdates).toHaveLength(0);
    });

    it('denies the wrong Eveider driver', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow();
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) return eveiderDriverRow({ user_id: 'courier-1' });
        if (sqlIncludes(sql, 'FROM deliveries')) {
          return deliveryRow({ driver_id: 'other-driver' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'DRIVER_NOT_ASSIGNED');
    });

    it('denies a business driver', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow();
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) {
          return eveiderDriverRow({ contractor_type: 'business', user_id: 'biz-driver' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'NOT_EVEIDER_DRIVER');
    });

    it('denies the wrong locker', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow({ id: 'locker-1' });
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ locker_id: 'locker-2' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'WRONG_LOCKER');
    });

    it('denies the wrong parcel state', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'created' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'INVALID_PARCEL_STATE');
    });

    it('denies when no compatible compartment is available', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ package_size: 'large' });
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) return eveiderDriverRow();
        if (sqlIncludes(sql, 'FROM deliveries')) {
          return deliveryRow({ driver_id: 'courier-1' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
          return [compartmentRow({ id: 'comp-small', size: 'small', status: 'available' })];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'NO_COMPARTMENT_AVAILABLE');
    });

    it('denies a second concurrent authorization for the same parcel', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow();
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) return eveiderDriverRow();
        if (sqlIncludes(sql, 'FROM deliveries')) {
          return deliveryRow({ driver_id: 'courier-1' });
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
          return [compartmentRow({ status: 'available', size: 'medium' })];
        }
        if (sqlIncludes(sql, 'SET status = \'reserved\'')) {
          return compartmentRow({ status: 'reserved', size: 'medium' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return lockerActionSessionRow();
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'SESSION_CONFLICT');
    });
  });

  describe('Flow 2 deposit', () => {
    const input = {
      action: 'deposit' as const,
      actorType: 'business_representative' as const,
      businessPhone: '+243800000001',
      trackingNumber: tracking,
    };

    it('authorizes a pre-handoff merchant deposit without creating a Livraison', async () => {
      const deliveryInserts: string[] = [];
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({
            status: 'created',
            pickup_type: 'merchant_dropoff',
          });
        }
        if (sqlIncludes(sql, 'FROM businesses')) {
          return businessRow({ contact_phone: '+243800000001', is_phone_verified: true });
        }
        if (sqlIncludes(sql, 'FROM deliveries')) return null;
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
          return [compartmentRow({ status: 'available', size: 'medium' })];
        }
        if (sqlIncludes(sql, 'SET status = \'reserved\'')) {
          return compartmentRow({ status: 'reserved', size: 'medium' });
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({ actor_type: 'business_representative' });
        }
        if (sqlIncludes(sql, 'INSERT INTO deliveries')) {
          deliveryInserts.push(sql);
          return deliveryRow();
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });

      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
      expect(deliveryInserts).toHaveLength(0);
    });

    it('denies the wrong business identity', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'created', pickup_type: 'merchant_dropoff' });
        }
        if (sqlIncludes(sql, 'FROM businesses')) {
          return businessRow({ contact_phone: '+243899999999', is_phone_verified: true });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'INVALID_CREDENTIALS');
    });
  });

  describe('recipient return deposit', () => {
    const input = {
      action: 'deposit' as const,
      actorType: 'recipient' as const,
      phone: '+243000000000',
      trackingNumber: tracking,
      returnCode: 'R4C0DE',
    };

    it('authorizes an authorized collected return at the return locker', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'collected', pickup_type: 'courier_pickup' });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'authorized',
              method: 'eveider_return',
              return_locker_id: 'locker-1',
              return_code: 'R4C0DE',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: null,
          };
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE locker_id')) {
          return [compartmentRow({ status: 'available', size: 'medium' })];
        }
        if (sqlIncludes(sql, 'SET status = \'reserved\'')) {
          return compartmentRow({ status: 'reserved' });
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({ actor_type: 'recipient' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
    });

    it('denies a wrong return code', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'collected' });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'authorized',
              method: 'eveider_return',
              return_locker_id: 'locker-1',
              return_code: 'OTHER',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: null,
          };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'INVALID_CREDENTIALS');
    });

    it('denies a partner Point', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) {
          return lockerRow({ type: 'PARTNER_POINT' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'LOCKER_TYPE_NOT_SUPPORTED');
    });
  });

  describe('Flow 3A driver pickup', () => {
    const input = {
      action: 'driver_pickup' as const,
      actorType: 'eveider_driver' as const,
      driverId: '11111111-1111-4111-8111-111111111111',
      trackingNumber: tracking,
    };

    it('authorizes an assigned Eveider return pickup at the occupied compartment', async () => {
      setup((sql, values) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({
            status: 'return_at_point',
            compartment_id: 'comp-1',
          });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'awaiting_pickup',
              method: 'eveider_return',
              return_locker_id: 'locker-1',
              compartment_id: 'comp-1',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: 'A1',
          };
        }
        if (sqlIncludes(sql, 'FROM driver_dossiers')) return eveiderDriverRow();
        if (sqlIncludes(sql, 'FROM deliveries')) {
          const kind = values?.[1];
          if (kind === 'return') return null;
          return deliveryRow({ kind: 'customer_return', driver_id: 'courier-1', status: 'assigned' });
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
          return compartmentRow({ status: 'occupied' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({
            action: 'driver_pickup',
            compartment_id: 'comp-1',
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
      expect(result.compartment?.id).toBe('comp-1');
    });

    it('denies a business_pickup return', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'return_at_point', compartment_id: 'comp-1' });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'awaiting_pickup',
              method: 'business_pickup',
              return_locker_id: 'locker-1',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: 'A1',
          };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'WRONG_RETURN_METHOD');
    });
  });

  describe('recipient collection commercial gate', () => {
    const input = {
      action: 'recipient_collection' as const,
      actorType: 'recipient' as const,
      phone: '+243000000000',
      trackingNumber: tracking,
      pickupPin: '482913',
    };

    function collectionSql(opts: {
      status?: string;
      charge?: Record<string, unknown> | null;
      paid?: boolean;
      pin?: string | null;
      commercialModel?: string;
    }) {
      return (sql: string) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({
            status: opts.status ?? 'ready_for_pickup',
            commercial_model: opts.commercialModel ?? 'canonical',
            compartment_id: 'comp-1',
          });
        }
        if (sqlIncludes(sql, 'FROM pickup_pins')) {
          return opts.pin === null ? null : { code: opts.pin ?? '482913' };
        }
        if (sqlIncludes(sql, 'FROM parcels') && sqlIncludes(sql, 'commercial_model')) {
          return {
            status: opts.status ?? 'ready_for_pickup',
            pickup_type: 'courier_pickup',
            commercial_model: opts.commercialModel ?? 'canonical',
            payment_responsibility: 'receiver_pays',
          };
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) return opts.charge === undefined
          ? {
              id: 'charge-1',
              parcel_id: 'parcel-1',
              business_id: 'biz-1',
              kind: 'outbound_delivery',
              status: 'owed',
              payer: 'recipient',
              pricing_zone_id: 'zone-1',
              amount: 0,
              currency: 'CDF',
              unit_rate: null,
              quantity: null,
              period_started_at: null,
              period_ended_at: null,
              locked_at: new Date('2026-01-15T12:00:00.000Z'),
              created_at: new Date('2026-01-15T12:00:00.000Z'),
              updated_at: new Date('2026-01-15T12:00:00.000Z'),
            }
          : opts.charge === null
            ? null
            : {
                id: 'charge-1',
                parcel_id: 'parcel-1',
                business_id: 'biz-1',
                kind: 'outbound_delivery',
                status: 'owed',
                payer: 'recipient',
                pricing_zone_id: 'zone-1',
                amount: 1500,
                currency: 'CDF',
                unit_rate: null,
                quantity: null,
                period_started_at: null,
                period_ended_at: null,
                locked_at: new Date('2026-01-15T12:00:00.000Z'),
                created_at: new Date('2026-01-15T12:00:00.000Z'),
                updated_at: new Date('2026-01-15T12:00:00.000Z'),
                ...opts.charge,
              };
        if (sqlIncludes(sql, 'FROM parcel_payments')) {
          return opts.paid ? { id: 'pay-1' } : null;
        }
        if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
          return compartmentRow({ status: 'occupied' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({ action: 'recipient_collection' });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      };
    }

    it('authorizes a paid or zero-amount ready parcel without marking COLLECTED', async () => {
      const collected: string[] = [];
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
          collected.push(sql);
          return lockerTrackingRow({ status: 'collected' });
        }
        return collectionSql({ charge: { amount: 0, kind: 'outbound_delivery', status: 'owed' } })(sql);
      });
      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
      expect(collected).toHaveLength(0);
    });

    it('denies unpaid canonical collection as PAYMENT_REQUIRED', async () => {
      setup(collectionSql({
        charge: { amount: 1500, kind: 'outbound_delivery', status: 'owed' },
        paid: false,
      }));
      await expectDenial(repo, input, 'PAYMENT_REQUIRED');
    });

    it('denies a missing required canonical charge', async () => {
      setup(collectionSql({ charge: null, commercialModel: 'canonical' }));
      await expectDenial(repo, input, 'CANONICAL_CHARGE_MISSING');
    });

    it('denies AT_POINT before collection preparation', async () => {
      setup(collectionSql({ status: 'delivered_to_locker' }));
      await expectDenial(repo, input, 'INVALID_PARCEL_STATE');
    });

    it('denies a wrong PIN', async () => {
      setup(collectionSql({ pin: '000000' }));
      await expectDenial(repo, input, 'INVALID_CREDENTIALS');
    });
  });

  describe('Flow 3B business pickup', () => {
    const input = {
      action: 'business_return_pickup' as const,
      actorType: 'business_representative' as const,
      businessPhone: '+243800000001',
      trackingNumber: tracking,
    };

    it('authorizes without blocking on an unpaid return_locker charge', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({
            status: 'return_at_point',
            compartment_id: 'comp-1',
          });
        }
        if (sqlIncludes(sql, 'FROM businesses')) {
          return businessRow({ contact_phone: '+243800000001', is_phone_verified: true });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'awaiting_pickup',
              method: 'business_pickup',
              return_locker_id: 'locker-1',
              compartment_id: 'comp-1',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: 'A1',
          };
        }
        if (sqlIncludes(sql, 'FROM deliveries')) return null;
        if (sqlIncludes(sql, 'FROM compartments WHERE id')) {
          return compartmentRow({ status: 'occupied' });
        }
        if (sqlIncludes(sql, 'FROM locker_action_sessions') && sqlIncludes(sql, 'authorized')) {
          return null;
        }
        if (sqlIncludes(sql, 'FROM parcel_charges')) {
          throw new Error('business return must not inspect return_locker payment');
        }
        if (sqlIncludes(sql, 'INSERT INTO locker_action_sessions')) {
          return lockerActionSessionRow({
            action: 'business_return_pickup',
            actor_type: 'business_representative',
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const result = await repo.authorize('locker-1', input);
      expect(result.authorized).toBe(true);
    });

    it('denies a Flow 3A return', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) return [];
        if (sqlIncludes(sql, 'FROM lockers WHERE id')) return lockerRow();
        if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'tracking_number')) {
          return lockerTrackingRow({ status: 'return_at_point', compartment_id: 'comp-1' });
        }
        if (sqlIncludes(sql, 'FROM businesses')) {
          return businessRow({ contact_phone: '+243800000001', is_phone_verified: true });
        }
        if (sqlIncludes(sql, 'FROM parcel_returns')) {
          return {
            ...parcelReturnRow({
              status: 'awaiting_pickup',
              method: 'eveider_return',
              return_locker_id: 'locker-1',
            }),
            return_locker_json: { id: 'locker-1', name: 'Gombe', address: 'Gombe' },
            compartment_label: 'A1',
          };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expectDenial(repo, input, 'WRONG_RETURN_METHOD');
    });
  });

  describe('session security', () => {
    it('rejects confirm on an expired session and releases the reservation', async () => {
      const releases: unknown[][] = [];
      let loaded = 0;
      setup((sql, values) => {
        if (sqlIncludes(sql, 'SELECT * FROM locker_action_sessions')) {
          loaded += 1;
          return lockerActionSessionRow({
            status: loaded === 1 ? 'authorized' : 'expired',
            expires_at: new Date('2026-01-15T11:00:00.000Z'),
          });
        }
        if (sqlIncludes(sql, 'FOR UPDATE SKIP LOCKED')) {
          releases.push(['expired-session']);
          return { expired: 1, released: 1 };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });

      await expect(
        repo.confirm('locker-1', 'session-1', { result: 'success' }),
      ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
      expect(releases).toHaveLength(1);
    });

    it('rejects a cancelled session', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'SELECT * FROM locker_action_sessions')) {
          return lockerActionSessionRow({ status: 'cancelled' });
        }
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) {
          return [];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(
        repo.confirm('locker-1', 'session-1', { result: 'success' }),
      ).rejects.toMatchObject({ code: 'SESSION_CANCELLED' });
    });

    it('rejects confirm from another locker identity', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'SELECT * FROM locker_action_sessions')) {
          return lockerActionSessionRow({ locker_id: 'locker-1', status: 'authorized' });
        }
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) {
          return [];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(
        repo.confirm('locker-2', 'session-1', { result: 'success' }),
      ).rejects.toMatchObject({ code: 'WRONG_LOCKER' });
    });

    it('replays a confirmed session as already_confirmed', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'SELECT * FROM locker_action_sessions')) {
          return lockerActionSessionRow({
            status: 'confirmed',
            confirmed_at: new Date('2026-01-15T12:01:00.000Z'),
            device_event_id: 'plc-1',
          });
        }
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) {
          return [];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const result = await repo.confirm('locker-1', 'session-1', {
        result: 'success',
        deviceEventId: 'plc-1',
      });
      expect(result.alreadyConfirmed).toBe(true);
    });

    it('cancels an authorized deposit and releases the reserved compartment', async () => {
      const releases: unknown[][] = [];
      setup((sql, values) => {
        if (sqlIncludes(sql, 'SELECT * FROM locker_action_sessions')) {
          return lockerActionSessionRow({ status: 'authorized', action: 'deposit' });
        }
        if (sqlIncludes(sql, 'UPDATE locker_action_sessions') && sqlIncludes(sql, 'expired')) {
          return [];
        }
        if (sqlIncludes(sql, 'SET status = \'cancelled\'')) return null;
        if (sqlIncludes(sql, 'SET status = \'available\'')) {
          releases.push(values ?? []);
          return null;
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const result = await repo.cancel('locker-1', 'session-1');
      expect(result.cancelled).toBe(true);
      expect(releases[0]?.[0]).toBe('comp-1');
    });
  });

  describe('expireLockerActionSessions', () => {
    it('expires a stale deposit and reports the reserved compartment released', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FOR UPDATE SKIP LOCKED')) {
          return { expired: 1, released: 1 };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.expireLockerActionSessions()).resolves.toEqual({
        expired: 1,
        released: 1,
      });
    });

    it('is idempotent when nothing remains to expire', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FOR UPDATE SKIP LOCKED')) {
          return { expired: 0, released: 0 };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.expireLockerActionSessions()).resolves.toEqual({
        expired: 0,
        released: 0,
      });
      await expect(repo.expireLockerActionSessions()).resolves.toEqual({
        expired: 0,
        released: 0,
      });
    });

    it('does not treat occupied compartments as released', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, 'FOR UPDATE SKIP LOCKED') && sqlIncludes(sql, "c.status = 'reserved'")) {
          return { expired: 1, released: 0 };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      await expect(repo.expireLockerActionSessions('locker-1')).resolves.toEqual({
        expired: 1,
        released: 0,
      });
    });

    it('reports reserved compartments that have no live session', async () => {
      setup((sql) => {
        if (sqlIncludes(sql, "c.status = 'reserved'")) {
          return { id: 'comp-1', locker_id: 'locker-1' };
        }
        if (sqlIncludes(sql, "c.status = 'occupied'")) return [];
        if (sqlIncludes(sql, 'locker_collection_credentials')) return [];
        if (sqlIncludes(sql, "s.status = 'confirmed'")) return [];
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const findings = await repo.inspectLockerIntegrity('locker-1');
      expect(findings).toEqual([
        expect.objectContaining({
          kind: 'reserved_without_session',
          compartmentId: 'comp-1',
        }),
      ]);
    });

    it('serializes concurrent sweeps with SKIP LOCKED', async () => {
      let calls = 0;
      setup((sql) => {
        if (sqlIncludes(sql, 'FOR UPDATE SKIP LOCKED')) {
          calls += 1;
          return calls === 1 ? { expired: 1, released: 1 } : { expired: 0, released: 0 };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const [first, second] = await Promise.all([
        repo.expireLockerActionSessions(),
        repo.expireLockerActionSessions(),
      ]);
      expect([first, second]).toEqual(
        expect.arrayContaining([
          { expired: 1, released: 1 },
          { expired: 0, released: 0 },
        ]),
      );
    });
  });
});

describe('LockerAuthorizationError', () => {
  it('carries a machine-readable code', () => {
    const err = new LockerAuthorizationError('PAYMENT_REQUIRED');
    expect(err.code).toBe('PAYMENT_REQUIRED');
    expect(createDataAccessContext({ platformRole: 'super_admin' }).role).toBe('admin');
  });
});
