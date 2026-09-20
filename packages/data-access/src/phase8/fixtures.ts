import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidTrackingNumber } from '@eveider/domain';
import type { Queryable } from '../db/pool.js';
import {
  PHASE8_BUSINESS_EMAIL,
  PHASE8_BUSINESS_PHONE,
  PHASE8_DEST_LOCKER_NAME,
  PHASE8_DRIVER_EMAIL,
  PHASE8_OTHER_LOCKER_NAME,
  PHASE8_PINS,
  PHASE8_RECIPIENT,
  PHASE8_REFS,
  PHASE8_REFERENCE_PREFIX,
  PHASE8_RETURN_CODES,
  PHASE8_RETURN_LOCKER_NAME,
  phase8TrackingNumber,
  type Phase8Ref,
} from './ids.js';

export type Phase8Actors = {
  businessId: string;
  businessPhone: string;
  customerId: string;
  driverId: string;
  destLockerId: string;
  returnLockerId: string;
  otherLockerId: string;
  zoneId: string;
};

function loadRootEnv(): void {
  if (process.env.DATABASE_URL) return;
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const envFile = resolve(root, '.env');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function ensurePhase8Env(): string | null {
  loadRootEnv();
  return process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim() || null;
}

function pinHash(pin: string): string {
  return createHash('sha256').update(pin.trim(), 'utf8').digest('hex');
}

async function one<T>(db: Queryable, sql: string, values: unknown[]): Promise<T> {
  const result = await db.query(sql, values);
  const row = result.rows[0] as T | undefined;
  if (!row) throw new Error(`Phase 8 fixture lookup failed: ${sql.slice(0, 80)}`);
  return row;
}

async function takeCompartment(db: Queryable, lockerId: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM compartments
     WHERE locker_id = $1 AND status = 'available'
     ORDER BY CASE size WHEN 'small' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, label
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [lockerId],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`No available compartment on locker ${lockerId}`);
  return String(id);
}

export async function loadPhase8Actors(db: Queryable): Promise<Phase8Actors> {
  const business = await one<{ id: string; contact_phone: string }>(
    db,
    `SELECT id, contact_phone FROM businesses WHERE contact_email = $1 LIMIT 1`,
    [PHASE8_BUSINESS_EMAIL],
  );
  const customer = await one<{ id: string }>(
    db,
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [PHASE8_RECIPIENT.email],
  );
  const driver = await one<{ id: string }>(
    db,
    `SELECT u.id
     FROM users u
     JOIN driver_dossiers d ON d.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [PHASE8_DRIVER_EMAIL],
  );
  await db.query(
    `UPDATE driver_dossiers
     SET contractor_type = 'eveider',
         business_id = NULL,
         status = 'active'
     WHERE user_id = $1`,
    [driver.id],
  );
  const dest = await one<{ id: string }>(
    db,
    `SELECT id FROM lockers WHERE name = $1 AND type = 'SMART_LOCKER' LIMIT 1`,
    [PHASE8_DEST_LOCKER_NAME],
  );
  const ret = await one<{ id: string }>(
    db,
    `SELECT id FROM lockers WHERE name = $1 AND type = 'SMART_LOCKER' LIMIT 1`,
    [PHASE8_RETURN_LOCKER_NAME],
  );
  const other = await one<{ id: string }>(
    db,
    `SELECT id FROM lockers WHERE name = $1 AND type = 'SMART_LOCKER' LIMIT 1`,
    [PHASE8_OTHER_LOCKER_NAME],
  );
  const zone = await one<{ id: string }>(
    db,
    `SELECT id FROM service_areas WHERE code = 'LSH' LIMIT 1`,
    [],
  );

  await db.query(
    `UPDATE lockers SET service_area_id = $1
     WHERE id = ANY($2::uuid[]) AND service_area_id IS NULL`,
    [zone.id, [dest.id, ret.id, other.id]],
  );

  return {
    businessId: String(business.id),
    businessPhone: String(business.contact_phone ?? PHASE8_BUSINESS_PHONE),
    customerId: String(customer.id),
    driverId: String(driver.id),
    destLockerId: String(dest.id),
    returnLockerId: String(ret.id),
    otherLockerId: String(other.id),
    zoneId: String(zone.id),
  };
}

export async function deletePhase8Parcels(db: Queryable): Promise<void> {
  const occupied = await db.query<{ compartment_id: string }>(
    `SELECT compartment_id FROM parcels
     WHERE reference LIKE $1 AND compartment_id IS NOT NULL
     UNION
     SELECT compartment_id FROM parcel_returns
     WHERE parcel_id IN (SELECT id FROM parcels WHERE reference LIKE $1)
       AND compartment_id IS NOT NULL`,
    [`${PHASE8_REFERENCE_PREFIX}%`],
  );
  const compartmentIds = occupied.rows.map((row) => String(row.compartment_id));
  await db.query(
    `DELETE FROM deliveries WHERE parcel_id IN (SELECT id FROM parcels WHERE reference LIKE $1)`,
    [`${PHASE8_REFERENCE_PREFIX}%`],
  );
  await db.query(`DELETE FROM parcels WHERE reference LIKE $1`, [`${PHASE8_REFERENCE_PREFIX}%`]);
  if (compartmentIds.length > 0) {
    await db.query(
      `UPDATE compartments SET status = 'available', updated_at = NOW()
       WHERE id = ANY($1::uuid[])
         AND NOT EXISTS (SELECT 1 FROM parcels p WHERE p.compartment_id = compartments.id)
         AND NOT EXISTS (
           SELECT 1 FROM locker_action_sessions s
           WHERE s.compartment_id = compartments.id AND s.status = 'authorized'
         )`,
      [compartmentIds],
    );
  }
}

async function releaseOrphanCompartments(db: Queryable, lockerIds: string[]): Promise<void> {
  await db.query(
    `UPDATE compartments SET status = 'available', updated_at = NOW()
     WHERE locker_id = ANY($1::uuid[])
       AND status IN ('reserved', 'occupied')
       AND NOT EXISTS (SELECT 1 FROM parcels p WHERE p.compartment_id = compartments.id)
       AND NOT EXISTS (
         SELECT 1 FROM parcel_returns r WHERE r.compartment_id = compartments.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM locker_action_sessions s
         WHERE s.compartment_id = compartments.id AND s.status = 'authorized'
       )`,
    [lockerIds],
  );
}

type ParcelSpec = {
  ref: Phase8Ref;
  status: string;
  pickupType: 'courier_pickup' | 'merchant_dropoff';
  occupy?: boolean;
  occupyLocker?: 'dest' | 'return' | 'other';
  packageSize?: 'small' | 'medium' | 'large';
  pin?: boolean;
  charge?: { kind: string; amount: number; payer: 'recipient' | 'business' };
  paid?: boolean;
  delivery?: { kind: 'outbound' | 'customer_return' | 'return'; status: string };
  customerReturn?: {
    status: string;
    method?: 'eveider_return' | 'business_pickup';
    occupyReturn?: boolean;
  };
  readyAt?: Date;
};

const SPECS: ParcelSpec[] = [
  { ref: PHASE8_REFS.FLOW1_NEW, status: 'created', pickupType: 'courier_pickup', packageSize: 'small', charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' } },
  {
    ref: PHASE8_REFS.FLOW1_TRANSIT,
    status: 'in_transit',
    pickupType: 'courier_pickup',
    packageSize: 'small',
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    delivery: { kind: 'outbound', status: 'scanned' },
  },
  {
    ref: PHASE8_REFS.FLOW1_READY_UNPAID,
    status: 'ready_for_pickup',
    pickupType: 'courier_pickup',
    occupy: true,
    pin: true,
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    delivery: { kind: 'outbound', status: 'completed' },
    readyAt: new Date(),
  },
  {
    ref: PHASE8_REFS.FLOW1_READY_PAID,
    status: 'ready_for_pickup',
    pickupType: 'courier_pickup',
    occupy: true,
    pin: true,
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    paid: true,
    delivery: { kind: 'outbound', status: 'completed' },
    readyAt: new Date(),
  },
  { ref: PHASE8_REFS.FLOW2_NEW, status: 'created', pickupType: 'merchant_dropoff', packageSize: 'small', charge: { kind: 'locker_collection', amount: 1500, payer: 'recipient' } },
  {
    ref: PHASE8_REFS.FLOW2_READY_UNPAID,
    status: 'ready_for_pickup',
    pickupType: 'merchant_dropoff',
    occupy: true,
    occupyLocker: 'other',
    pin: true,
    charge: { kind: 'locker_collection', amount: 1500, payer: 'recipient' },
    readyAt: new Date(),
  },
  {
    ref: PHASE8_REFS.FLOW2_READY_PAID,
    status: 'ready_for_pickup',
    pickupType: 'merchant_dropoff',
    occupy: true,
    occupyLocker: 'other',
    pin: true,
    charge: { kind: 'locker_collection', amount: 1500, payer: 'recipient' },
    paid: true,
    readyAt: new Date(),
  },
  {
    ref: PHASE8_REFS.ZERO_FEE,
    status: 'ready_for_pickup',
    pickupType: 'courier_pickup',
    occupy: true,
    occupyLocker: 'other',
    pin: true,
    charge: { kind: 'outbound_delivery', amount: 0, payer: 'recipient' },
    delivery: { kind: 'outbound', status: 'completed' },
    readyAt: new Date(),
  },
  {
    ref: PHASE8_REFS.COLLECTED,
    status: 'collected',
    pickupType: 'courier_pickup',
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    paid: true,
    delivery: { kind: 'outbound', status: 'completed' },
  },
  {
    ref: PHASE8_REFS.RETURN_REQUESTED,
    status: 'collected',
    pickupType: 'courier_pickup',
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    paid: true,
    delivery: { kind: 'outbound', status: 'completed' },
    customerReturn: { status: 'requested' },
  },
  {
    ref: PHASE8_REFS.RETURN_3A,
    status: 'return_at_point',
    pickupType: 'courier_pickup',
    charge: { kind: 'return_delivery', amount: 1500, payer: 'business' },
    delivery: { kind: 'outbound', status: 'completed' },
    customerReturn: { status: 'awaiting_pickup', method: 'eveider_return', occupyReturn: true },
  },
  {
    ref: PHASE8_REFS.RETURN_3B,
    status: 'return_at_point',
    pickupType: 'merchant_dropoff',
    charge: { kind: 'return_locker', amount: 1500, payer: 'business' },
    customerReturn: { status: 'awaiting_pickup', method: 'business_pickup', occupyReturn: true },
  },
  {
    ref: PHASE8_REFS.RTS_HISTORICAL,
    status: 'returned',
    pickupType: 'courier_pickup',
    delivery: { kind: 'return', status: 'completed' },
  },
  {
    ref: PHASE8_REFS.MISSING_CHARGE,
    status: 'ready_for_pickup',
    pickupType: 'courier_pickup',
    occupy: true,
    occupyLocker: 'other',
    pin: true,
    delivery: { kind: 'outbound', status: 'completed' },
    readyAt: new Date(),
  },
  {
    ref: PHASE8_REFS.AT_POINT_PIN,
    status: 'delivered_to_locker',
    pickupType: 'courier_pickup',
    occupy: true,
    pin: true,
    charge: { kind: 'outbound_delivery', amount: 1500, payer: 'recipient' },
    delivery: { kind: 'outbound', status: 'completed' },
  },
];

async function insertParcel(
  db: Queryable,
  actors: Phase8Actors,
  spec: ParcelSpec,
): Promise<string> {
  const tracking = phase8TrackingNumber(spec.ref);
  if (!isValidTrackingNumber(tracking)) {
    throw new Error(`Invalid Phase 8 tracking for ${spec.ref}: ${tracking}`);
  }
  const occupyLockerId =
    spec.occupyLocker === 'return' || spec.customerReturn?.occupyReturn
      ? actors.returnLockerId
      : spec.occupyLocker === 'other'
        ? actors.otherLockerId
        : actors.destLockerId;
  let compartmentId: string | null = null;
  if (spec.occupy || spec.customerReturn?.occupyReturn) {
    compartmentId = await takeCompartment(db, occupyLockerId);
    await db.query(`UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`, [
      compartmentId,
    ]);
  }

  const lockerId = spec.customerReturn?.occupyReturn
    ? actors.returnLockerId
    : spec.occupyLocker === 'other'
      ? actors.otherLockerId
      : actors.destLockerId;
  const result = await db.query<{ id: string }>(
    `INSERT INTO parcels (
       tracking_number, reference, status, business_id, customer_id,
       recipient_phone, recipient_name, locker_id, compartment_id,
       pickup_type, sender_name, sender_phone, sender_address,
       package_size, package_category, payment_responsibility,
       commercial_model, ready_for_pickup_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, 'Boutique Kenya', $11, $12,
       $14, 'other', 'receiver_pays',
       'canonical', $13
     )
     RETURNING id`,
    [
      tracking,
      spec.ref,
      spec.status,
      actors.businessId,
      actors.customerId,
      PHASE8_RECIPIENT.phone,
      PHASE8_RECIPIENT.name,
      lockerId,
      spec.customerReturn?.occupyReturn ? compartmentId : spec.occupy ? compartmentId : null,
      spec.pickupType,
      PHASE8_BUSINESS_PHONE,
      spec.pickupType === 'courier_pickup' ? 'Av. de la Révolution, Kenya, Lubumbashi' : null,
      spec.readyAt ?? null,
      spec.packageSize ?? 'medium',
    ],
  );
  const parcelId = String(result.rows[0]!.id);

  if (spec.charge) {
    await db.query(
      `INSERT INTO parcel_charges (
         parcel_id, business_id, kind, status, payer, amount, currency, pricing_zone_id, locked_at
       ) VALUES ($1, $2, $3, 'owed', $4, $5, 'CDF', $6, NOW())`,
      [
        parcelId,
        actors.businessId,
        spec.charge.kind,
        spec.charge.payer,
        spec.charge.amount,
        spec.charge.kind === 'outbound_delivery' || spec.charge.kind === 'return_delivery'
          ? actors.zoneId
          : null,
      ],
    );
  }

  if (spec.paid) {
    await db.query(
      `INSERT INTO parcel_payments (
         parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status, completed_at
       ) VALUES ($1, $2, gen_random_uuid(), '1500', 'CDF', 'pawapay', $3, 'completed', NOW())`,
      [parcelId, actors.customerId, PHASE8_RECIPIENT.phone],
    );
  }

  if (spec.delivery) {
    await db.query(
      `INSERT INTO deliveries (parcel_id, driver_id, status, kind, scanned_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        parcelId,
        actors.driverId,
        spec.delivery.status,
        spec.delivery.kind,
        spec.delivery.status === 'assigned' ? null : new Date(),
        spec.delivery.status === 'completed' ? new Date() : null,
      ],
    );
  }

  const pin = spec.pin ? PHASE8_PINS[spec.ref] : null;
  if (pin) {
    await db.query(`INSERT INTO pickup_pins (parcel_id, code) VALUES ($1, $2)`, [parcelId, pin]);
    const collectable = spec.status === 'ready_for_pickup';
    const activate = collectable && (spec.paid || spec.charge?.amount === 0);
    if (collectable && spec.ref !== PHASE8_REFS.MISSING_CHARGE) {
      await db.query(
        `INSERT INTO locker_collection_credentials (
           parcel_id, locker_id, compartment_id, tracking_number,
           recipient_phone_normalized, pin_hash, status, version,
           activated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)`,
        [
          parcelId,
          lockerId,
          compartmentId,
          tracking,
          '243970111001',
          pinHash(pin),
          activate ? 'active' : 'pending',
          activate ? new Date() : null,
        ],
      );
    }
  }

  if (spec.customerReturn) {
    const returnCode = PHASE8_RETURN_CODES[spec.ref] ?? null;
    await db.query(
      `INSERT INTO parcel_returns (
         parcel_id, business_id, status, method, return_locker_id, compartment_id,
         return_code, requested_at, authorized_at, deposited_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)`,
      [
        parcelId,
        actors.businessId,
        spec.customerReturn.status,
        spec.customerReturn.method ?? null,
        spec.customerReturn.method ? actors.returnLockerId : null,
        spec.customerReturn.occupyReturn ? compartmentId : null,
        returnCode,
        spec.customerReturn.status === 'requested' ? null : new Date(),
        spec.customerReturn.occupyReturn ? new Date() : null,
      ],
    );
  }

  return parcelId;
}

export async function resetPhase8Fixtures(db: Queryable): Promise<Phase8Actors> {
  const actors = await loadPhase8Actors(db);
  await deletePhase8Parcels(db);
  await releaseOrphanCompartments(db, [actors.destLockerId, actors.returnLockerId, actors.otherLockerId]);
  for (const spec of SPECS) {
    await insertParcel(db, actors, spec);
  }
  return actors;
}

export async function findPhase8Parcel(
  db: Queryable,
  ref: Phase8Ref,
): Promise<{
  id: string;
  trackingNumber: string;
  status: string;
  pickupType: string;
  lockerId: string | null;
  compartmentId: string | null;
  commercialModel: string;
}> {
  const row = await one<{
    id: string;
    tracking_number: string;
    status: string;
    pickup_type: string;
    locker_id: string | null;
    compartment_id: string | null;
    commercial_model: string;
  }>(
    db,
    `SELECT id, tracking_number, status, pickup_type, locker_id, compartment_id, commercial_model
     FROM parcels WHERE reference = $1 LIMIT 1`,
    [ref],
  );
  return {
    id: String(row.id),
    trackingNumber: String(row.tracking_number),
    status: String(row.status),
    pickupType: String(row.pickup_type),
    lockerId: row.locker_id == null ? null : String(row.locker_id),
    compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
    commercialModel: String(row.commercial_model),
  };
}

ensurePhase8Env();
