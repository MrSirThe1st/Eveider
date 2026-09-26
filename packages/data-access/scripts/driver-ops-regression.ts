/**
 * Focused driver-ops V1 regression against the local database.
 * Run: pnpm --filter @eveider/data-access exec dotenv -e ../../.env -- tsx scripts/driver-ops-regression.ts
 *
 * Non-destructive: creates temporary parcels/returns when needed, cleans them up.
 * Does not wipe Auth users or seed.
 */
import { createDataAccessContext } from '../src/context.js';
import { getPool } from '../src/db/pool.js';
import { DeliveryRepository } from '../src/repositories/delivery.repository.js';
import { NotificationRepository } from '../src/repositories/notification.repository.js';
import { randomUUID } from 'node:crypto';

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const pool = getPool();
  const db = pool;
  const notifications = new NotificationRepository(db);
  const deliveries = new DeliveryRepository(db, notifications);

  let platform = await db.query(
    `SELECT id, driver_self_assignment_enabled FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
  );
  if (!platform.rows[0]) {
    await db.query(
      `INSERT INTO platform_settings (
         pickup_fee_amount, pickup_fee_currency, require_org_approval,
         default_daily_shipments, default_monthly_shipments,
         default_max_package_value_usd, default_cod_daily_limit_usd,
         default_enabled_features, driver_self_assignment_enabled
       ) VALUES (
         5.00, 'CDF', FALSE, 50, 1000, 500.00, 200.00,
         '["CREATE_SHIPMENT","API_ACCESS","COD","MONTHLY_INVOICE"]'::jsonb, FALSE
       )`,
    );
    platform = await db.query(
      `SELECT id, driver_self_assignment_enabled FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
    );
  }
  const settingsId = platform.rows[0]?.id as string | undefined;
  const previousSelfAssign = Boolean(platform.rows[0]?.driver_self_assignment_enabled);

  const driver = await db.query(
    `SELECT d.user_id, d.id AS dossier_id, d.is_accepting_work, d.full_name
     FROM driver_dossiers d
     WHERE d.contractor_type = 'eveider'
       AND d.status IN ('approved', 'invited', 'active')
       AND d.user_id IS NOT NULL
     ORDER BY d.created_at ASC
     LIMIT 1`,
  );
  const driverUserId = driver.rows[0]?.user_id as string | undefined;
  const dossierId = driver.rows[0]?.dossier_id as string | undefined;
  const previousAccepting = driver.rows[0]?.is_accepting_work !== false;

  if (!driverUserId || !dossierId || !settingsId) {
    throw new Error('Need an Eveider driver dossier + platform_settings for regression');
  }

  const locker = await db.query(
    `SELECT id FROM lockers WHERE status = 'active' ORDER BY created_at ASC LIMIT 1`,
  );
  const lockerId = locker.rows[0]?.id as string | undefined;
  const business = await db.query(
    `SELECT id FROM businesses WHERE COALESCE(is_platform_org, false) = false ORDER BY created_at ASC LIMIT 1`,
  );
  const businessId = business.rows[0]?.id as string | undefined;
  if (!lockerId || !businessId) {
    throw new Error('Need an active locker and business');
  }

  // Prefer free compartments only when needed for deposit completion.
  async function nextFreeCompartment(): Promise<string | null> {
    const result = await db.query(
      `SELECT c.id
       FROM compartments c
       WHERE c.locker_id = $1
         AND c.status = 'available'
         AND NOT EXISTS (SELECT 1 FROM parcels p WHERE p.compartment_id = c.id)
       ORDER BY c.label ASC
       LIMIT 1`,
      [lockerId],
    );
    return result.rows[0]?.id ? String(result.rows[0].id) : null;
  }

  const createdParcelIds: string[] = [];
  const createdReturnIds: string[] = [];
  const createdDeliveryIds: string[] = [];

  const adminUser = await db.query(
    `SELECT id FROM users WHERE platform_role IS NOT NULL ORDER BY created_at ASC LIMIT 1`,
  );
  const adminUserId = adminUser.rows[0]?.id as string | undefined;
  if (!adminUserId) {
    throw new Error('Need a platform admin user for assign regression');
  }

  const courierCtx = createDataAccessContext('courier', { userId: driverUserId });
  const adminCtx = createDataAccessContext('admin', { userId: adminUserId });

  // Ensure self-assignment on for this run
  await db.query(
    `UPDATE platform_settings SET driver_self_assignment_enabled = TRUE, updated_at = NOW() WHERE id = $1`,
    [settingsId],
  );
  await db.query(
    `UPDATE driver_dossiers SET is_accepting_work = TRUE, updated_at = NOW() WHERE id = $1`,
    [dossierId],
  );

  try {
    // --- Create outbound claimable parcel ---
    const outboundId = randomUUID();
    const outboundTracking = `REG${Date.now().toString(36).toUpperCase()}O`;
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model,
         due_at, driver_instructions, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000001', 'QA Dest',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '1 Test St',
         'medium', 'other', 'receiver_pays', 'legacy',
         NOW() + INTERVAL '2 hours', 'Entrée arrière QA', NOW()
       )`,
      [outboundId, outboundTracking, businessId, lockerId],
    );
    createdParcelIds.push(outboundId);

    // --- Create eligible return ---
    const returnParcelId = randomUUID();
    const returnTracking = `REG${Date.now().toString(36).toUpperCase()}R`;
    const returnCompartmentId = await nextFreeCompartment();
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, compartment_id, pickup_type, sender_name, sender_phone,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'return_at_point', $3, '+243900000003', 'QA Return Dest',
         $4, $5, 'courier_pickup', 'QA Sender', '+243900000002',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [returnParcelId, returnTracking, businessId, lockerId, returnCompartmentId],
    );
    createdParcelIds.push(returnParcelId);
    const returnId = randomUUID();
    await db.query(
      `INSERT INTO parcel_returns (
         id, parcel_id, business_id, status, method, return_locker_id, compartment_id, updated_at
       ) VALUES ($1, $2, $3, 'awaiting_pickup', 'eveider_return', $4, $5, NOW())`,
      [returnId, returnParcelId, businessId, lockerId, returnCompartmentId],
    );
    createdReturnIds.push(returnId);

    // 1) Available pool includes outbound + return
    const available = await deliveries.listAvailableForClaim(courierCtx);
    const hasOutbound = available.some((item) => item.parcelId === outboundId && item.kind === 'outbound');
    const hasReturn = available.some(
      (item) => item.parcelId === returnParcelId && item.kind === 'customer_return',
    );
    record('Disponibles includes outbound', hasOutbound);
    record('Disponibles includes eligible return', hasReturn, `count=${available.length}`);

    // due_at ordering: return has null due_at, outbound has due — overdue/nearest first
    const outboundItem = available.find((item) => item.parcelId === outboundId);
    record(
      'driver_instructions present on claimable outbound',
      outboundItem?.driverInstructions === 'Entrée arrière QA',
    );

    // 2) Unavailable driver cannot self-claim
    await db.query(
      `UPDATE driver_dossiers SET is_accepting_work = FALSE, updated_at = NOW() WHERE id = $1`,
      [dossierId],
    );
    const emptyWhenUnavailable = await deliveries.listAvailableForClaim(courierCtx);
    record('Unavailable driver sees empty Disponibles', emptyWhenUnavailable.length === 0);
    await expectReject(
      () => deliveries.claim(courierCtx, outboundId, 'outbound'),
      'Disponible',
      'Unavailable driver cannot claim',
    );
    await db.query(
      `UPDATE driver_dossiers SET is_accepting_work = TRUE, updated_at = NOW() WHERE id = $1`,
      [dossierId],
    );

    // 3) Admin assign → accept → start → manual confirm
    const assigned = await deliveries.assign(adminCtx, outboundId, driverUserId, 'outbound');
    createdDeliveryIds.push(assigned.id);
    record('Admin assign creates assigned', assigned.status === 'assigned');

    const accepted = await deliveries.accept(courierCtx, assigned.id);
    record('Driver accept → accepted', accepted.status === 'accepted');
    const started = await deliveries.start(courierCtx, accepted.id);
    record('Driver start → started', started.status === 'started');
    const confirmed = await deliveries.confirmPickup(courierCtx, started.id, { mode: 'manual' });
    record('Manual pickup confirm → scanned', confirmed.status === 'scanned');

    // Scan path on a second outbound
    const scanParcelId = randomUUID();
    const scanTracking = `REG${Date.now().toString(36).toUpperCase()}S`;
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000004', 'QA Scan',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '2 Test St',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [scanParcelId, scanTracking, businessId, lockerId],
    );
    createdParcelIds.push(scanParcelId);
    const assignedScan = await deliveries.assign(adminCtx, scanParcelId, driverUserId, 'outbound');
    createdDeliveryIds.push(assignedScan.id);
    await deliveries.accept(courierCtx, assignedScan.id);
    await deliveries.start(courierCtx, assignedScan.id);
    const scanned = await deliveries.scan(courierCtx, assignedScan.id, scanTracking);
    record('Barcode scan confirm → scanned', scanned.status === 'scanned');

    // Confirm pickup is required (cannot mark drop-off from started)
    await expectReject(
      async () => {
        // Use a third parcel left at started
        const p = randomUUID();
        const t = `REG${Date.now().toString(36).toUpperCase()}X`;
        await db.query(
          `INSERT INTO parcels (
             id, tracking_number, status, business_id, recipient_phone, recipient_name,
             locker_id, pickup_type, sender_name, sender_phone, sender_address,
             package_size, package_category, payment_responsibility, commercial_model, updated_at
           ) VALUES (
             $1, $2, 'created', $3, '+243900000005', 'QA Gate',
             $4, 'courier_pickup', 'QA Sender', '+243900000002', '3 Test St',
             'medium', 'other', 'receiver_pays', 'legacy', NOW()
           )`,
          [p, t, businessId, lockerId],
        );
        createdParcelIds.push(p);
        const d = await deliveries.assign(adminCtx, p, driverUserId, 'outbound');
        createdDeliveryIds.push(d.id);
        await deliveries.accept(courierCtx, d.id);
        await deliveries.start(courierCtx, d.id);
        await deliveries.markDropOffPending(courierCtx, d.id);
      },
      'prise en charge',
      'Pickup confirmation required before deposit',
    );

    // 4) Self-claim outbound
    const claimParcelId = randomUUID();
    const claimTracking = `REG${Date.now().toString(36).toUpperCase()}C`;
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000006', 'QA Claim',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '4 Test St',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [claimParcelId, claimTracking, businessId, lockerId],
    );
    createdParcelIds.push(claimParcelId);
    const claimed = await deliveries.claim(courierCtx, claimParcelId, 'outbound');
    createdDeliveryIds.push(claimed.id);
    record('Self-claim outbound → accepted', claimed.status === 'accepted');

    // 5) Dual claim race
    const raceParcelId = randomUUID();
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000007', 'QA Race',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '5 Test St',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [raceParcelId, `REG${Date.now().toString(36).toUpperCase()}Z`, businessId, lockerId],
    );
    createdParcelIds.push(raceParcelId);
    const first = await deliveries.claim(courierCtx, raceParcelId, 'outbound');
    createdDeliveryIds.push(first.id);
    let secondFailed = false;
    try {
      await deliveries.claim(courierCtx, raceParcelId, 'outbound');
    } catch (error) {
      secondFailed = /plus disponible|unique|duplicate/i.test(
        error instanceof Error ? error.message : String(error),
      );
    }
    record('Second claim of same parcel fails', secondFailed);

    const jpegPhoto = `data:image/jpeg;base64,${Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 64 }, () => 0x00),
    ]).toString('base64')}`;

    // 6) Return claim
    const claimedReturn = await deliveries.claim(courierCtx, returnParcelId, 'customer_return');
    createdDeliveryIds.push(claimedReturn.id);
    record('Self-claim return → accepted', claimedReturn.status === 'accepted');
    const returnStarted = await deliveries.start(courierCtx, claimedReturn.id);
    record('Return start → started', returnStarted.status === 'started');
    const returnCollected = await deliveries.confirmPickup(courierCtx, returnStarted.id, {
      mode: 'manual',
    });
    record('Return pickup confirm → scanned', returnCollected.status === 'scanned');
    const returnDone = await deliveries.completeDropOff(
      courierCtx,
      returnCollected.id,
      undefined,
      jpegPhoto,
    );
    record('Return handoff → completed', returnDone.status === 'completed');

    // 7) Drop-off / POD path for first outbound (already scanned)
    const pending = await deliveries.markDropOffPending(courierCtx, assigned.id);
    record('markDropOffPending → drop_off_pending', pending.status === 'drop_off_pending');

    const depositCompartmentId = await nextFreeCompartment();
    if (depositCompartmentId) {
      const completed = await deliveries.completeDropOff(
        courierCtx,
        assigned.id,
        depositCompartmentId,
        jpegPhoto,
      );
      record('POD complete → completed', completed.status === 'completed');
    } else {
      record('POD complete → completed', false, 'no available compartment');
    }

    // 8) Fail/incident path
    const failParcelId = randomUUID();
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000008', 'QA Fail',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '6 Test St',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [failParcelId, `REG${Date.now().toString(36).toUpperCase()}F`, businessId, lockerId],
    );
    createdParcelIds.push(failParcelId);
    const failDelivery = await deliveries.assign(adminCtx, failParcelId, driverUserId, 'outbound');
    createdDeliveryIds.push(failDelivery.id);
    await deliveries.accept(courierCtx, failDelivery.id);
    const failed = await deliveries.fail(courierCtx, failDelivery.id);
    record('Fail path → failed', failed.status === 'failed');

    // 9) Admin assign while unavailable still works (warn is UI-only)
    await db.query(
      `UPDATE driver_dossiers SET is_accepting_work = FALSE, updated_at = NOW() WHERE id = $1`,
      [dossierId],
    );
    const warnParcelId = randomUUID();
    await db.query(
      `INSERT INTO parcels (
         id, tracking_number, status, business_id, recipient_phone, recipient_name,
         locker_id, pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility, commercial_model, updated_at
       ) VALUES (
         $1, $2, 'created', $3, '+243900000009', 'QA Warn',
         $4, 'courier_pickup', 'QA Sender', '+243900000002', '7 Test St',
         'medium', 'other', 'receiver_pays', 'legacy', NOW()
       )`,
      [warnParcelId, `REG${Date.now().toString(36).toUpperCase()}W`, businessId, lockerId],
    );
    createdParcelIds.push(warnParcelId);
    const warnAssign = await deliveries.assign(adminCtx, warnParcelId, driverUserId, 'outbound');
    createdDeliveryIds.push(warnAssign.id);
    record(
      'Admin can assign unavailable driver (backend allows)',
      warnAssign.status === 'assigned',
    );
  } finally {
    // Cleanup deliveries first (FK), then returns, then parcels
    for (const id of createdDeliveryIds) {
      await db.query(`DELETE FROM parcel_events WHERE delivery_id = $1`, [id]).catch(() => undefined);
      await db.query(`DELETE FROM deliveries WHERE id = $1`, [id]).catch(() => undefined);
    }
    for (const id of createdReturnIds) {
      await db.query(`DELETE FROM parcel_returns WHERE id = $1`, [id]).catch(() => undefined);
    }
    for (const id of createdParcelIds) {
      await db.query(`DELETE FROM parcel_events WHERE parcel_id = $1`, [id]).catch(() => undefined);
      await db.query(`DELETE FROM parcels WHERE id = $1`, [id]).catch(() => undefined);
    }
    await db.query(
      `UPDATE platform_settings SET driver_self_assignment_enabled = $1, updated_at = NOW() WHERE id = $2`,
      [previousSelfAssign, settingsId],
    );
    await db.query(
      `UPDATE driver_dossiers SET is_accepting_work = $1, updated_at = NOW() WHERE id = $2`,
      [previousAccepting, dossierId],
    );
    await pool.end().catch(() => undefined);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log('\n--- Summary ---');
  console.log(`Passed: ${checks.length - failed.length}/${checks.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL: ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
    process.exit(1);
  }
}

async function expectReject(
  fn: () => Promise<unknown>,
  messagePart: string,
  name: string,
) {
  try {
    await fn();
    record(name, false, 'expected rejection');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record(name, message.toLowerCase().includes(messagePart.toLowerCase()), message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
