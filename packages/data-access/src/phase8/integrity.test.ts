import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../db/index.js';
import { createRepositories } from '../index.js';
import { CommercialRepository } from '../repositories/commercial.repository.js';
import {
  ensurePhase8Env,
  findPhase8Parcel,
  resetPhase8Fixtures,
  type Phase8Actors,
} from './fixtures.js';
import { PHASE8_DEST_LOCKER_NAME, PHASE8_REFS, phase8TrackingNumber } from './ids.js';

const live = Boolean(ensurePhase8Env());

describe.skipIf(!live)('Phase 8 fixture integrity', () => {
  let actors: Phase8Actors;

  beforeAll(async () => {
    actors = await resetPhase8Fixtures(db);
  }, 60_000);

  it('keeps Flow 2 parcels free of Livraison rows', async () => {
    for (const ref of [PHASE8_REFS.FLOW2_NEW, PHASE8_REFS.FLOW2_READY_UNPAID, PHASE8_REFS.FLOW2_READY_PAID] as const) {
      const parcel = await findPhase8Parcel(db, ref);
      expect(parcel.pickupType).toBe('merchant_dropoff');
      const deliveries = await db.query(
        `SELECT id FROM deliveries WHERE parcel_id = $1`,
        [parcel.id],
      );
      expect(deliveries.rows).toHaveLength(0);
      expect(parcel.status).not.toBe('in_transit');
    }
  });

  it('keeps Flow 3B free of customer_return Livraison', async () => {
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3B);
    expect(parcel.status).toBe('return_at_point');
    const deliveries = await db.query(
      `SELECT id FROM deliveries WHERE parcel_id = $1 AND kind = 'customer_return'`,
      [parcel.id],
    );
    expect(deliveries.rows).toHaveLength(0);
    const ret = await db.query(
      `SELECT method, status FROM parcel_returns WHERE parcel_id = $1 LIMIT 1`,
      [parcel.id],
    );
    expect(ret.rows[0]).toMatchObject({ method: 'business_pickup', status: 'awaiting_pickup' });
  });

  it('keeps Flow 1 fulfillment as Collecte Eveider with real outbound Livraison when in transit', async () => {
    const created = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW);
    expect(created.pickupType).toBe('courier_pickup');
    expect(created.status).toBe('created');
    const createdDeliveries = await db.query(`SELECT id FROM deliveries WHERE parcel_id = $1`, [
      created.id,
    ]);
    expect(createdDeliveries.rows).toHaveLength(0);

    const transit = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);
    expect(transit.status).toBe('in_transit');
    const liv = await db.query(
      `SELECT kind, status, driver_id FROM deliveries WHERE parcel_id = $1`,
      [transit.id],
    );
    expect(liv.rows).toHaveLength(1);
    expect(liv.rows[0]).toMatchObject({ kind: 'outbound', status: 'scanned', driver_id: actors.driverId });
  });

  it('uses eveider_return on 3A without a customer_return Livraison yet', async () => {
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A);
    expect(parcel.status).toBe('return_at_point');
    const ret = await db.query(
      `SELECT method, status FROM parcel_returns WHERE parcel_id = $1 LIMIT 1`,
      [parcel.id],
    );
    expect(ret.rows[0]).toMatchObject({ method: 'eveider_return', status: 'awaiting_pickup' });
    const liv = await db.query(
      `SELECT id FROM deliveries WHERE parcel_id = $1 AND kind = 'customer_return'`,
      [parcel.id],
    );
    expect(liv.rows).toHaveLength(0);
  });

  it('marks READY fixtures READY and AT_POINT as delivered_to_locker', async () => {
    for (const ref of [
      PHASE8_REFS.FLOW1_READY_UNPAID,
      PHASE8_REFS.FLOW1_READY_PAID,
      PHASE8_REFS.FLOW2_READY_UNPAID,
      PHASE8_REFS.FLOW2_READY_PAID,
      PHASE8_REFS.ZERO_FEE,
      PHASE8_REFS.MISSING_CHARGE,
    ] as const) {
      expect((await findPhase8Parcel(db, ref)).status).toBe('ready_for_pickup');
    }
    expect((await findPhase8Parcel(db, PHASE8_REFS.AT_POINT_PIN)).status).toBe('delivered_to_locker');
  });

  it('stores canonical charges with the correct kind and payer', async () => {
    const flow1 = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW);
    const flow2 = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    const threeA = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A);
    const threeB = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3B);
    const missing = await findPhase8Parcel(db, PHASE8_REFS.MISSING_CHARGE);

    const charge = async (id: string) =>
      db.query(`SELECT kind, payer, amount FROM parcel_charges WHERE parcel_id = $1 AND status <> 'void'`, [
        id,
      ]);

    expect((await charge(flow1.id)).rows[0]).toMatchObject({
      kind: 'outbound_delivery',
      payer: 'recipient',
    });
    expect((await charge(flow2.id)).rows[0]).toMatchObject({
      kind: 'locker_collection',
      payer: 'recipient',
    });
    expect((await charge(threeA.id)).rows[0]).toMatchObject({
      kind: 'return_delivery',
      payer: 'business',
    });
    expect((await charge(threeB.id)).rows[0]).toMatchObject({
      kind: 'return_locker',
      payer: 'business',
    });
    expect((await charge(missing.id)).rows).toHaveLength(0);
    const commercial = new CommercialRepository(db);
    const decision = await commercial.evaluateRecipientCollection(missing.id);
    expect(decision.code).toBe('CANONICAL_CHARGE_MISSING');
    expect(decision.authorized).toBe(false);
  });

  it('uses SMART_LOCKER destinations and an Eveider fleet driver', async () => {
    const locker = await db.query(`SELECT name, type FROM lockers WHERE id = $1`, [actors.destLockerId]);
    expect(locker.rows[0]).toMatchObject({ name: PHASE8_DEST_LOCKER_NAME, type: 'SMART_LOCKER' });
    const dossier = await db.query(
      `SELECT contractor_type, status FROM driver_dossiers WHERE user_id = $1`,
      [actors.driverId],
    );
    expect(dossier.rows[0]).toMatchObject({ contractor_type: 'eveider', status: 'active' });
    expect(isValidTracking(phase8TrackingNumber(PHASE8_REFS.FLOW1_NEW))).toBe(true);
  });

  it('shields the four canonical flow invariants', async () => {
    const flow1 = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);
    expect(flow1.status).toBe('in_transit');
    expect(
      (await db.query(`SELECT kind FROM deliveries WHERE parcel_id = $1`, [flow1.id])).rows[0]?.kind,
    ).toBe('outbound');

    for (const ref of [PHASE8_REFS.FLOW2_NEW, PHASE8_REFS.FLOW2_READY_UNPAID, PHASE8_REFS.FLOW2_READY_PAID] as const) {
      const parcel = await findPhase8Parcel(db, ref);
      expect(parcel.status).not.toBe('in_transit');
      expect(
        (await db.query(`SELECT id FROM deliveries WHERE parcel_id = $1`, [parcel.id])).rows,
      ).toHaveLength(0);
    }

    const threeA = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A);
    expect(threeA.status).toBe('return_at_point');
    expect(
      (
        await db.query(
          `SELECT method FROM parcel_returns WHERE parcel_id = $1`,
          [threeA.id],
        )
      ).rows[0]?.method,
    ).toBe('eveider_return');

    const threeB = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3B);
    expect(threeB.status).not.toBe('returning');
    expect(
      (
        await db.query(
          `SELECT id FROM deliveries WHERE parcel_id = $1 AND kind = 'customer_return'`,
          [threeB.id],
        )
      ).rows,
    ).toHaveLength(0);

    const atPoint = await findPhase8Parcel(db, PHASE8_REFS.AT_POINT_PIN);
    expect(atPoint.status).toBe('delivered_to_locker');
    expect(atPoint.status).not.toBe('ready_for_pickup');

    const unpaid = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_READY_UNPAID);
    const commercial = new CommercialRepository(db);
    expect((await commercial.evaluateRecipientCollection(unpaid.id)).authorized).toBe(false);

    const collected = await findPhase8Parcel(db, PHASE8_REFS.COLLECTED);
    expect(
      (
        await db.query(
          `SELECT status FROM locker_collection_credentials WHERE parcel_id = $1 AND status = 'active'`,
          [collected.id],
        )
      ).rows,
    ).toHaveLength(0);

    const rts = await findPhase8Parcel(db, PHASE8_REFS.RTS_HISTORICAL);
    expect(
      (await db.query(`SELECT kind FROM deliveries WHERE parcel_id = $1`, [rts.id])).rows[0]?.kind,
    ).toBe('return');
  });

  it('finds no integrity violations on Phase 8 compartments', async () => {
    const repos = createRepositories();
    const findings = await repos.lockerActions.inspectLockerIntegrity();
    const owned = await db.query<{ id: string; compartment_id: string | null }>(
      `SELECT id, compartment_id FROM parcels WHERE reference LIKE 'F8-%'`,
    );
    const parcelIds = new Set(owned.rows.map((row) => String(row.id)));
    const compartmentIds = new Set(
      owned.rows
        .map((row) => (row.compartment_id == null ? null : String(row.compartment_id)))
        .filter((id): id is string => Boolean(id)),
    );
    expect(
      findings.filter(
        (item) =>
          (item.parcelId && parcelIds.has(item.parcelId)) ||
          (item.compartmentId && compartmentIds.has(item.compartmentId)),
      ),
    ).toEqual([]);
  });
});

function isValidTracking(value: string): boolean {
  return /^EVD26[0-9A-HJKMNP-TV-Z]{8}[0-9A-HJKMNP-TV-Z*~$=U]$/.test(value);
}
