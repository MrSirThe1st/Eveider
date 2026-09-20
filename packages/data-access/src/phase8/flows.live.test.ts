/**
 * Phase 8 live tests. Isolation: each describe() calls resetPhase8Fixtures() in
 * beforeAll, which deletes only `F8-%` parcels (deliveries first) and reinserts
 * deterministic IDs. Tests do not share parcels across files and do not rely on
 * execution order of other suites. Demo LSH-* seeds are left untouched.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LockerAuthorizationError } from '../locker-api/errors.js';
import { createDataAccessContext } from '../context.js';
import { db } from '../db/index.js';
import { createRepositories } from '../index.js';
import {
  ensurePhase8Env,
  findPhase8Parcel,
  resetPhase8Fixtures,
  type Phase8Actors,
} from './fixtures.js';
import {
  PHASE8_BUSINESS_PHONE,
  PHASE8_PINS,
  PHASE8_RECIPIENT,
  PHASE8_REFS,
  PHASE8_RETURN_CODES,
} from './ids.js';

const live = Boolean(ensurePhase8Env());

function adminCtx() {
  return createDataAccessContext('admin');
}

function driverCtx(driverId: string) {
  return createDataAccessContext('courier', { userId: driverId });
}

function customerCtx(customerId: string) {
  return createDataAccessContext('customer', {
    userId: customerId,
    phone: PHASE8_RECIPIENT.phone,
    isCustomer: true,
  });
}

function businessCtx(businessId: string) {
  return createDataAccessContext('business', {
    organizationId: businessId,
    organizationRole: 'account_owner',
  });
}

async function countDeliveries(parcelId: string, kind?: string): Promise<number> {
  const result = kind
    ? await db.query(`SELECT COUNT(*)::int AS n FROM deliveries WHERE parcel_id = $1 AND kind = $2`, [
        parcelId,
        kind,
      ])
    : await db.query(`SELECT COUNT(*)::int AS n FROM deliveries WHERE parcel_id = $1`, [parcelId]);
  return Number(result.rows[0]?.n ?? 0);
}

function compartmentId(result: { compartment: { id: string } | null }): string {
  const id = result.compartment?.id;
  if (!id) throw new Error('Expected reserved compartment');
  return id;
}

describe.skipIf(!live)('Phase 8 Flow 1 happy path', () => {
  let actors: Phase8Actors;

  beforeAll(async () => {
    actors = await resetPhase8Fixtures(db);
  }, 60_000);

  it('runs Collecte Eveider from CREATED through COLLECTED', async () => {
    const repos = createRepositories();
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW);
    expect(parcel.status).toBe('created');
    expect(await countDeliveries(parcel.id)).toBe(0);

    const delivery = await repos.deliveries.assign(adminCtx(), parcel.id, actors.driverId, 'outbound');
    expect(delivery.kind).toBe('outbound');
    expect(delivery.status).toBe('assigned');
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW)).status).toBe('created');

    await repos.deliveries.scan(driverCtx(actors.driverId), delivery.id, parcel.trackingNumber);
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW)).status).toBe('in_transit');

    const authorized = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'deposit',
      actorType: 'eveider_driver',
      driverId: actors.driverId,
      trackingNumber: parcel.trackingNumber,
    });
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW)).status).toBe('in_transit');
    const reserved = await db.query(`SELECT status FROM compartments WHERE id = $1`, [
      compartmentId(authorized),
    ]);
    expect(reserved.rows[0]?.status).toBe('reserved');

    const first = await repos.lockerActions.confirm(actors.destLockerId, authorized.sessionId, {
      result: 'success',
      deviceEventId: `phase8-flow1-${authorized.sessionId}`,
    });
    expect(first.alreadyConfirmed).toBe(false);
    const replay = await repos.lockerActions.confirm(actors.destLockerId, authorized.sessionId, {
      result: 'success',
      deviceEventId: `phase8-flow1-${authorized.sessionId}`,
    });
    expect(replay.alreadyConfirmed).toBe(true);

    const atPoint = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW);
    expect(atPoint.status).toBe('delivered_to_locker');
    expect(
      (await db.query(`SELECT status FROM compartments WHERE id = $1`, [compartmentId(authorized)]))
        .rows[0]?.status,
    ).toBe('occupied');
    expect(
      (
        await db.query(`SELECT status FROM deliveries WHERE parcel_id = $1 AND kind = 'outbound'`, [
          parcel.id,
        ])
      ).rows[0]?.status,
    ).toBe('completed');

    const atPointEvents = await db.query<{ event_type: string }>(
      `SELECT event_type FROM parcel_events WHERE parcel_id = $1`,
      [parcel.id],
    );
    expect(atPointEvents.rows.some((row) => row.event_type === 'pickup_pin.issued')).toBe(false);

    const ready = await repos.parcels.prepareCollection(adminCtx(), parcel.id);
    expect(ready.status).toBe('ready_for_pickup');
    expect((await repos.parcels.prepareCollection(adminCtx(), parcel.id)).status).toBe(
      'ready_for_pickup',
    );
    expect(
      Number(
        (await db.query(`SELECT COUNT(*)::int AS n FROM pickup_pins WHERE parcel_id = $1`, [parcel.id]))
          .rows[0]?.n,
      ),
    ).toBe(1);
    expect(
      (
        await db.query(
          `SELECT event_type FROM parcel_events WHERE parcel_id = $1 AND event_type = 'pickup_pin.issued'`,
          [parcel.id],
        )
      ).rows,
    ).toHaveLength(1);

    const unpaid = await repos.commercial.evaluateRecipientCollection(parcel.id);
    expect(unpaid.authorized).toBe(false);
    expect(unpaid.code).toBe('PAYMENT_OUTSTANDING');

    await db.query(
      `INSERT INTO parcel_payments (
         parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status, completed_at
       ) VALUES ($1, $2, gen_random_uuid(), '1500', 'CDF', 'pawapay', $3, 'completed', NOW())`,
      [parcel.id, actors.customerId, PHASE8_RECIPIENT.phone],
    );
    await repos.collectionCredentials.reconcileForParcel(parcel.id);
    expect((await repos.commercial.evaluateRecipientCollection(parcel.id)).authorized).toBe(true);
    expect(
      (
        await db.query(
          `SELECT status FROM locker_collection_credentials WHERE parcel_id = $1 AND status IN ('pending','active')`,
          [parcel.id],
        )
      ).rows[0]?.status,
    ).toBe('active');

    const pinRow = await db.query<{ code: string }>(
      `SELECT code FROM pickup_pins WHERE parcel_id = $1 LIMIT 1`,
      [parcel.id],
    );
    const collected = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'recipient_collection',
      actorType: 'recipient',
      phone: PHASE8_RECIPIENT.phone,
      trackingNumber: parcel.trackingNumber,
      pickupPin: String(pinRow.rows[0]!.code),
    });
    await repos.lockerActions.confirm(actors.destLockerId, collected.sessionId, {
      result: 'success',
      deviceEventId: `phase8-collect-${collected.sessionId}`,
    });
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW1_NEW)).status).toBe('collected');
    expect(
      (await db.query(`SELECT status FROM compartments WHERE id = $1`, [compartmentId(authorized)]))
        .rows[0]?.status,
    ).toBe('available');
  }, 90_000);
});

describe.skipIf(!live)('Phase 8 Flow 2 happy path', () => {
  let actors: Phase8Actors;

  beforeAll(async () => {
    actors = await resetPhase8Fixtures(db);
  }, 60_000);

  it('deposits without Livraison or IN_TRANSIT', async () => {
    const repos = createRepositories();
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    expect(await countDeliveries(parcel.id)).toBe(0);

    await expect(
      repos.deliveries.assign(adminCtx(), parcel.id, actors.driverId, 'outbound'),
    ).rejects.toThrow(/dépôt marchand/i);

    const authorized = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'deposit',
      actorType: 'business_representative',
      businessPhone: actors.businessPhone || PHASE8_BUSINESS_PHONE,
      trackingNumber: parcel.trackingNumber,
    });
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW)).status).toBe('created');
    await repos.lockerActions.confirm(actors.destLockerId, authorized.sessionId, {
      result: 'success',
      deviceEventId: `phase8-flow2-${authorized.sessionId}`,
    });
    const atPoint = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    expect(atPoint.status).toBe('delivered_to_locker');
    expect(atPoint.status).not.toBe('in_transit');
    expect(await countDeliveries(parcel.id)).toBe(0);

    await repos.parcels.prepareCollection(adminCtx(), parcel.id);
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW)).status).toBe('ready_for_pickup');
    expect(await countDeliveries(parcel.id)).toBe(0);
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW)).status).not.toBe('in_transit');
    expect((await repos.commercial.evaluateRecipientCollection(parcel.id)).authorized).toBe(false);

    await db.query(
      `INSERT INTO parcel_payments (
         parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status, completed_at
       ) VALUES ($1, $2, gen_random_uuid(), '1500', 'CDF', 'pawapay', $3, 'completed', NOW())`,
      [parcel.id, actors.customerId, PHASE8_RECIPIENT.phone],
    );
    await repos.collectionCredentials.reconcileForParcel(parcel.id);
    expect((await repos.commercial.evaluateRecipientCollection(parcel.id)).authorized).toBe(true);

    const pinRow = await db.query<{ code: string }>(
      `SELECT code FROM pickup_pins WHERE parcel_id = $1 LIMIT 1`,
      [parcel.id],
    );
    const collected = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'recipient_collection',
      actorType: 'recipient',
      phone: PHASE8_RECIPIENT.phone,
      trackingNumber: parcel.trackingNumber,
      pickupPin: String(pinRow.rows[0]!.code),
    });
    await repos.lockerActions.confirm(actors.destLockerId, collected.sessionId, {
      result: 'success',
      deviceEventId: `phase8-flow2-collect-${collected.sessionId}`,
    });
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW)).status).toBe('collected');
    expect(await countDeliveries(parcel.id)).toBe(0);
    expect(
      (
        await db.query(
          `SELECT COUNT(*)::int AS n FROM parcels WHERE id = $1 AND status = 'in_transit'`,
          [parcel.id],
        )
      ).rows[0]?.n,
    ).toBe(0);
  }, 90_000);
});

describe.skipIf(!live)('Phase 8 Flow 3A / 3B', () => {
  let actors: Phase8Actors;

  beforeAll(async () => {
    actors = await resetPhase8Fixtures(db);
  }, 60_000);

  it('assigns a customer_return Livraison for 3A then completes return transport', async () => {
    const repos = createRepositories();
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A);
    expect(await countDeliveries(parcel.id, 'customer_return')).toBe(0);

    const delivery = await repos.deliveries.assign(
      adminCtx(),
      parcel.id,
      actors.driverId,
      'customer_return',
    );
    expect(delivery.kind).toBe('customer_return');
    expect((await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A)).status).toBe('return_at_point');

    const pickup = await repos.lockerActions.authorize(actors.returnLockerId, {
      action: 'driver_pickup',
      actorType: 'eveider_driver',
      driverId: actors.driverId,
      trackingNumber: parcel.trackingNumber,
    });
    await repos.lockerActions.confirm(actors.returnLockerId, pickup.sessionId, {
      result: 'success',
      deviceEventId: `phase8-3a-pickup-${pickup.sessionId}`,
    });
    expect((await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A)).status).toBe('returning');

    await repos.deliveries.completeDropOff(driverCtx(actors.driverId), delivery.id);
    expect((await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A)).status).toBe('returned');
    expect(
      (await db.query(`SELECT status FROM parcel_returns WHERE parcel_id = $1`, [parcel.id])).rows[0]
        ?.status,
    ).toBe('completed');
    expect(
      (
        await db.query(
          `SELECT status FROM deliveries WHERE parcel_id = $1 AND kind = 'customer_return'`,
          [parcel.id],
        )
      ).rows[0]?.status,
    ).toBe('completed');
    expect(
      (
        await db.query(
          `SELECT payer, kind FROM parcel_charges WHERE parcel_id = $1 AND kind = 'return_delivery'`,
          [parcel.id],
        )
      ).rows[0],
    ).toMatchObject({ payer: 'business', kind: 'return_delivery' });
  }, 90_000);

  it('completes 3B without Livraison or RETURNING', async () => {
    const repos = createRepositories();
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3B);
    expect(await countDeliveries(parcel.id, 'customer_return')).toBe(0);

    await expect(
      repos.deliveries.assign(adminCtx(), parcel.id, actors.driverId, 'customer_return'),
    ).rejects.toThrow(/retrait marchand/i);

    const pickup = await repos.lockerActions.authorize(actors.returnLockerId, {
      action: 'business_return_pickup',
      actorType: 'business_representative',
      businessPhone: actors.businessPhone || PHASE8_BUSINESS_PHONE,
      trackingNumber: parcel.trackingNumber,
    });
    await repos.lockerActions.confirm(actors.returnLockerId, pickup.sessionId, {
      result: 'success',
      deviceEventId: `phase8-3b-${pickup.sessionId}`,
    });
    const done = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3B);
    expect(done.status).toBe('returned');
    expect(done.status).not.toBe('returning');
    expect(await countDeliveries(parcel.id, 'customer_return')).toBe(0);
  }, 60_000);

  it('enforces return eligibility, uniqueness, reject, and cancel rules', async () => {
    const repos = createRepositories();
    const created = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);
    await expect(
      repos.parcelReturns.requestByCustomer(customerCtx(actors.customerId), created.id),
    ).rejects.toThrow(/après le retrait/i);

    const collected = await findPhase8Parcel(db, PHASE8_REFS.COLLECTED);
    const requested = await repos.parcelReturns.requestByCustomer(
      customerCtx(actors.customerId),
      collected.id,
    );
    expect(requested.status).toBe('requested');
    expect((await findPhase8Parcel(db, PHASE8_REFS.COLLECTED)).status).toBe('collected');
    await expect(
      repos.parcelReturns.requestByCustomer(customerCtx(actors.customerId), collected.id),
    ).rejects.toThrow(/déjà en cours/i);

    await repos.parcelReturns.reject(businessCtx(actors.businessId), requested.id);
    expect((await findPhase8Parcel(db, PHASE8_REFS.COLLECTED)).status).toBe('collected');
    const again = await repos.parcelReturns.requestByCustomer(
      customerCtx(actors.customerId),
      collected.id,
    );
    expect(again.status).toBe('requested');
    await repos.parcelReturns.cancel(customerCtx(actors.customerId), again.id);
    expect((await findPhase8Parcel(db, PHASE8_REFS.COLLECTED)).status).toBe('collected');

    const deposited = await findPhase8Parcel(db, PHASE8_REFS.RETURN_3A);
    const depositedReturn = await db.query<{ id: string }>(
      `SELECT id FROM parcel_returns WHERE parcel_id = $1 LIMIT 1`,
      [deposited.id],
    );
    await expect(
      repos.parcelReturns.reject(businessCtx(actors.businessId), String(depositedReturn.rows[0]!.id)),
    ).rejects.toThrow();
    await expect(
      repos.parcelReturns.cancel(
        businessCtx(actors.businessId),
        String(depositedReturn.rows[0]!.id),
      ),
    ).rejects.toThrow();

    const duplicateAuthorize = await findPhase8Parcel(db, PHASE8_REFS.RETURN_REQUESTED);
    const ret = await db.query<{ id: string }>(
      `SELECT id FROM parcel_returns WHERE parcel_id = $1 LIMIT 1`,
      [duplicateAuthorize.id],
    );
    await repos.parcelReturns.authorize(businessCtx(actors.businessId), String(ret.rows[0]!.id), {
      method: 'eveider_return',
      returnLockerId: actors.returnLockerId,
    });
    await expect(
      repos.parcelReturns.authorize(businessCtx(actors.businessId), String(ret.rows[0]!.id), {
        method: 'eveider_return',
        returnLockerId: actors.returnLockerId,
      }),
    ).rejects.toThrow();
    const charges = await db.query(
      `SELECT COUNT(*)::int AS n FROM parcel_charges WHERE parcel_id = $1 AND kind = 'return_delivery' AND status <> 'void'`,
      [duplicateAuthorize.id],
    );
    expect(Number(charges.rows[0]?.n)).toBe(1);
  }, 60_000);
});

describe.skipIf(!live)('Phase 8 commercial, PIN, locker security', () => {
  let actors: Phase8Actors;

  beforeAll(async () => {
    actors = await resetPhase8Fixtures(db);
  }, 60_000);

  it('hides collection while unpaid, missing, or still AT_POINT', async () => {
    const repos = createRepositories();
    const unpaid = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_READY_UNPAID);
    const missing = await findPhase8Parcel(db, PHASE8_REFS.MISSING_CHARGE);
    const atPoint = await findPhase8Parcel(db, PHASE8_REFS.AT_POINT_PIN);
    const zero = await findPhase8Parcel(db, PHASE8_REFS.ZERO_FEE);
    const paid = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_READY_PAID);

    expect((await repos.commercial.evaluateRecipientCollection(unpaid.id)).code).toBe(
      'PAYMENT_OUTSTANDING',
    );
    expect((await repos.commercial.evaluateRecipientCollection(missing.id)).code).toBe(
      'CANONICAL_CHARGE_MISSING',
    );
    expect((await repos.commercial.evaluateRecipientCollection(atPoint.id)).code).toBe('NOT_READY');
    expect((await repos.commercial.evaluateRecipientCollection(zero.id)).authorized).toBe(true);
    expect((await repos.commercial.evaluateRecipientCollection(paid.id)).authorized).toBe(true);

    await expect(
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'recipient_collection',
        actorType: 'recipient',
        phone: PHASE8_RECIPIENT.phone,
        trackingNumber: unpaid.trackingNumber,
        pickupPin: PHASE8_PINS[PHASE8_REFS.FLOW1_READY_UNPAID]!,
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_REQUIRED' });

    await expect(
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'recipient_collection',
        actorType: 'recipient',
        phone: PHASE8_RECIPIENT.phone,
        trackingNumber: atPoint.trackingNumber,
        pickupPin: PHASE8_PINS[PHASE8_REFS.AT_POINT_PIN]!,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PARCEL_STATE' });
  });

  it('denies wrong locker, wrong driver, cancelled session, and illegal skips', async () => {
    const repos = createRepositories();
    const transit = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);

    await expect(
      repos.lockerActions.authorize(actors.otherLockerId, {
        action: 'deposit',
        actorType: 'eveider_driver',
        driverId: actors.driverId,
        trackingNumber: transit.trackingNumber,
      }),
    ).rejects.toMatchObject({ code: 'WRONG_LOCKER' });

    const otherEveider = await db.query<{ id: string }>(
      `SELECT u.id FROM users u JOIN driver_dossiers d ON d.user_id = u.id
       WHERE d.contractor_type = 'eveider' AND d.status = 'active' AND u.id <> $1 LIMIT 1`,
      [actors.driverId],
    );
    if (otherEveider.rows[0]) {
      await expect(
        repos.lockerActions.authorize(actors.destLockerId, {
          action: 'deposit',
          actorType: 'eveider_driver',
          driverId: String(otherEveider.rows[0].id),
          trackingNumber: transit.trackingNumber,
        }),
      ).rejects.toMatchObject({ code: 'DRIVER_NOT_ASSIGNED' });
    }

    const orgDriver = await db.query<{ id: string }>(
      `SELECT u.id FROM users u JOIN driver_dossiers d ON d.user_id = u.id
       WHERE d.contractor_type = 'business' AND d.status = 'active' LIMIT 1`,
    );
    if (orgDriver.rows[0]) {
      await expect(
        repos.lockerActions.authorize(actors.destLockerId, {
          action: 'deposit',
          actorType: 'eveider_driver',
          driverId: String(orgDriver.rows[0].id),
          trackingNumber: transit.trackingNumber,
        }),
      ).rejects.toMatchObject({ code: 'NOT_EVEIDER_DRIVER' });
    }

    await expect(repos.parcels.prepareCollection(adminCtx(), transit.id)).rejects.toThrow(
      /arrivé au casier/i,
    );

    const createdFlow2 = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    await expect(
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'deposit',
        actorType: 'eveider_driver',
        driverId: actors.driverId,
        trackingNumber: createdFlow2.trackingNumber,
      }),
    ).rejects.toBeInstanceOf(LockerAuthorizationError);

    const session = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'deposit',
      actorType: 'eveider_driver',
      driverId: actors.driverId,
      trackingNumber: transit.trackingNumber,
    });
    await repos.lockerActions.cancel(actors.destLockerId, session.sessionId);
    await expect(
      repos.lockerActions.confirm(actors.destLockerId, session.sessionId, { result: 'success' }),
    ).rejects.toMatchObject({ code: 'SESSION_CANCELLED' });
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT)).status).toBe('in_transit');
  });

  it('expires a reserved deposit without releasing occupied compartments', async () => {
    const repos = createRepositories();
    const created = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    const session = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'deposit',
      actorType: 'business_representative',
      businessPhone: actors.businessPhone || PHASE8_BUSINESS_PHONE,
      trackingNumber: created.trackingNumber,
    });
    await db.query(
      `UPDATE locker_action_sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [session.sessionId],
    );
    const expired = await repos.lockerActions.expireLockerActionSessions(actors.destLockerId);
    expect(expired.expired).toBeGreaterThanOrEqual(1);
    expect(
      (await db.query(`SELECT status FROM compartments WHERE id = $1`, [compartmentId(session)]))
        .rows[0]?.status,
    ).toBe('available');
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW)).status).toBe('created');

    const occupied = await findPhase8Parcel(db, PHASE8_REFS.AT_POINT_PIN);
    await repos.lockerActions.expireLockerActionSessions(occupied.lockerId);
    expect(
      (await db.query(`SELECT status FROM compartments WHERE id = $1`, [occupied.compartmentId]))
        .rows[0]?.status,
    ).toBe('occupied');
  });

  it('rejects mismatched deviceEventId, wrong return locker, and concurrent sessions', async () => {
    const repos = createRepositories();
    const parcel = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_READY_PAID);
    const pin = PHASE8_PINS[PHASE8_REFS.FLOW1_READY_PAID]!;
    const session = await repos.lockerActions.authorize(actors.destLockerId, {
      action: 'recipient_collection',
      actorType: 'recipient',
      phone: PHASE8_RECIPIENT.phone,
      trackingNumber: parcel.trackingNumber,
      pickupPin: pin,
    });
    await repos.lockerActions.confirm(actors.destLockerId, session.sessionId, {
      result: 'success',
      deviceEventId: 'event-a',
    });
    await expect(
      repos.lockerActions.confirm(actors.destLockerId, session.sessionId, {
        result: 'success',
        deviceEventId: 'event-b',
      }),
    ).rejects.toMatchObject({ code: 'SESSION_MISMATCH' });

    const authorizedReturn = await findPhase8Parcel(db, PHASE8_REFS.RETURN_REQUESTED);
    const ret = await db.query<{ id: string; status: string }>(
      `SELECT id, status FROM parcel_returns WHERE parcel_id = $1 LIMIT 1`,
      [authorizedReturn.id],
    );
    if (ret.rows[0]?.status === 'requested') {
      await repos.parcelReturns.authorize(businessCtx(actors.businessId), String(ret.rows[0].id), {
        method: 'eveider_return',
        returnLockerId: actors.returnLockerId,
      });
    }
    const code =
      PHASE8_RETURN_CODES[PHASE8_REFS.RETURN_3A] ??
      String(
        (
          await db.query<{ return_code: string }>(
            `SELECT return_code FROM parcel_returns WHERE parcel_id = $1`,
            [authorizedReturn.id],
          )
        ).rows[0]?.return_code,
      );
    await expect(
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'deposit',
        actorType: 'recipient',
        phone: PHASE8_RECIPIENT.phone,
        trackingNumber: authorizedReturn.trackingNumber,
        returnCode: code,
      }),
    ).rejects.toMatchObject({ code: 'WRONG_LOCKER' });

    const transit = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);
    const [first, second] = await Promise.allSettled([
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'deposit',
        actorType: 'eveider_driver',
        driverId: actors.driverId,
        trackingNumber: transit.trackingNumber,
      }),
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'deposit',
        actorType: 'eveider_driver',
        driverId: actors.driverId,
        trackingNumber: transit.trackingNumber,
      }),
    ]);
    const outcomes = [first, second];
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const denied = outcomes.find((item) => item.status === 'rejected');
    expect(denied?.status === 'rejected' ? denied.reason : null).toMatchObject({
      code: 'SESSION_CONFLICT',
    });
  });

  it('detects integrity violations and leaves historical RTS untouched', async () => {
    const repos = createRepositories();
    const occupied = await db.query<{ id: string }>(
      `SELECT id FROM compartments WHERE locker_id = $1 AND status = 'available' ORDER BY label LIMIT 1`,
      [actors.otherLockerId],
    );
    const compartmentIdValue = String(occupied.rows[0]!.id);
    await db.query(`UPDATE compartments SET status = 'reserved' WHERE id = $1`, [compartmentIdValue]);
    try {
      const findings = await repos.lockerActions.inspectLockerIntegrity(actors.otherLockerId);
      expect(findings.some((item) => item.kind === 'reserved_without_session')).toBe(true);
    } finally {
      await db.query(`UPDATE compartments SET status = 'available' WHERE id = $1`, [
        compartmentIdValue,
      ]);
    }

    const parcel = await findPhase8Parcel(db, PHASE8_REFS.RTS_HISTORICAL);
    expect(parcel.status).toBe('returned');
    expect((await db.query(`SELECT kind FROM deliveries WHERE parcel_id = $1`, [parcel.id])).rows[0]?.kind).toBe(
      'return',
    );
    expect(
      (await db.query(`SELECT id FROM parcel_returns WHERE parcel_id = $1`, [parcel.id])).rows,
    ).toHaveLength(0);
  });

  it('enforces unique live sessions and unique active returns at the database', async () => {
    const transit = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_TRANSIT);
    const liveSessions = await db.query(
      `SELECT COUNT(*)::int AS n FROM locker_action_sessions WHERE parcel_id = $1 AND status = 'authorized'`,
      [transit.id],
    );
    expect(Number(liveSessions.rows[0]?.n)).toBeLessThanOrEqual(1);

    const collected = await findPhase8Parcel(db, PHASE8_REFS.RETURN_REQUESTED);
    await expect(
      db.query(
        `INSERT INTO parcel_returns (parcel_id, business_id, status, requested_at)
         VALUES ($1, $2, 'requested', NOW())`,
        [collected.id, actors.businessId],
      ),
    ).rejects.toThrow();
  });

  it('denies the wrong business phone, missing-charge collection, and a second concurrent collection', async () => {
    const repos = createRepositories();
    const created = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_NEW);
    await expect(
      repos.lockerActions.authorize(actors.destLockerId, {
        action: 'deposit',
        actorType: 'business_representative',
        businessPhone: '+243999999999',
        trackingNumber: created.trackingNumber,
      }),
    ).rejects.toBeInstanceOf(LockerAuthorizationError);

    const missing = await findPhase8Parcel(db, PHASE8_REFS.MISSING_CHARGE);
    await expect(
      repos.lockerActions.authorize(missing.lockerId, {
        action: 'recipient_collection',
        actorType: 'recipient',
        phone: PHASE8_RECIPIENT.phone,
        trackingNumber: missing.trackingNumber,
        pickupPin: PHASE8_PINS[PHASE8_REFS.MISSING_CHARGE]!,
      }),
    ).rejects.toMatchObject({ code: 'CANONICAL_CHARGE_MISSING' });

    const paid = await findPhase8Parcel(db, PHASE8_REFS.FLOW2_READY_PAID);
    const pin = PHASE8_PINS[PHASE8_REFS.FLOW2_READY_PAID]!;
    const session = await repos.lockerActions.authorize(paid.lockerId, {
      action: 'recipient_collection',
      actorType: 'recipient',
      phone: PHASE8_RECIPIENT.phone,
      trackingNumber: paid.trackingNumber,
      pickupPin: pin,
    });
    const [first, second] = await Promise.allSettled([
      repos.lockerActions.confirm(paid.lockerId, session.sessionId, {
        result: 'success',
        deviceEventId: 'phase8-concurrent-collect',
      }),
      repos.lockerActions.confirm(paid.lockerId, session.sessionId, {
        result: 'success',
        deviceEventId: 'phase8-concurrent-collect',
      }),
    ]);
    expect([first, second].filter((item) => item.status === 'fulfilled')).not.toHaveLength(0);
    expect((await findPhase8Parcel(db, PHASE8_REFS.FLOW2_READY_PAID)).status).toBe('collected');
    expect(
      Number(
        (
          await db.query(
            `SELECT COUNT(*)::int AS n FROM locker_collection_credentials WHERE parcel_id = $1 AND status = 'consumed'`,
            [paid.id],
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
  });

  it('accrues locker_rental to the Business after the configured free window and stops after collection', async () => {
    const { syncParcelLockerRental } = await import('../repositories/parcel-rental.js');
    const { LockerSettingsRepository } = await import('../repositories/locker-settings.repository.js');
    const unpaid = await findPhase8Parcel(db, PHASE8_REFS.FLOW1_READY_UNPAID);
    const holdHours = (await new LockerSettingsRepository(db).getNetworkSettings()).pickupHoldHours;
    const readyAt = new Date(Date.now() - (holdHours + 25) * 60 * 60 * 1000);
    await db.query(`UPDATE parcels SET ready_for_pickup_at = $1 WHERE id = $2`, [
      readyAt,
      unpaid.id,
    ]);
    const threshold = new Date(readyAt.getTime() + holdHours * 60 * 60 * 1000);
    const none = await syncParcelLockerRental(db, {
      parcelId: unpaid.id,
      businessId: actors.businessId,
      readyForPickupAt: readyAt,
      endAt: threshold,
      lockerType: 'SMART_LOCKER',
      compartmentId: unpaid.compartmentId,
      finalize: false,
    });
    expect(none).toBeNull();

    const due = await syncParcelLockerRental(db, {
      parcelId: unpaid.id,
      businessId: actors.businessId,
      readyForPickupAt: readyAt,
      endAt: new Date(threshold.getTime() + 1),
      lockerType: 'SMART_LOCKER',
      compartmentId: unpaid.compartmentId,
      finalize: false,
    });
    expect(due?.kind).toBe('locker_rental');
    expect(due?.payer).toBe('business');
    expect(due?.quantity).toBe(1);

    const collectedAt = new Date(threshold.getTime() + 1);
    const stopped = await syncParcelLockerRental(db, {
      parcelId: unpaid.id,
      businessId: actors.businessId,
      readyForPickupAt: readyAt,
      endAt: collectedAt,
      lockerType: 'SMART_LOCKER',
      compartmentId: unpaid.compartmentId,
      finalize: true,
    });
    const later = await syncParcelLockerRental(db, {
      parcelId: unpaid.id,
      businessId: actors.businessId,
      readyForPickupAt: readyAt,
      endAt: new Date(collectedAt.getTime() + 48 * 60 * 60 * 1000),
      lockerType: 'SMART_LOCKER',
      compartmentId: unpaid.compartmentId,
      finalize: true,
    });
    expect(later?.quantity).toBe(stopped?.quantity);
    expect(later?.payer).toBe('business');
  });
});
