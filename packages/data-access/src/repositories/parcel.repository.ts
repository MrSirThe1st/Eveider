import {
  generatePickupPinCode,
  generateTrackingNumber,
  normalizeTrackingNumber,
  transitionParcel,
  type DeliveryStatus,
  type ParcelStatus,
} from '@eveider/domain';
import {
  assertAdmin,
  assertBusinessScope,
  assertCustomerRole,
  AccessDeniedError,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import {
  mapBusiness,
  mapLocker,
  mapParcel,
  mapPickupPin,
} from '../db/mappers.js';
import type { Business, Compartment, Locker, Parcel, PickupPin } from '../db/types.js';
import { phonesMatch } from '../tracking/guest-track.js';
import { BusinessRepository } from './business.repository.js';
import { LockerRepository } from './locker.repository.js';
import { NotificationRepository } from './notification.repository.js';
import { ParcelInviteRepository } from './parcel-invite.repository.js';
import { UserRepository } from './user.repository.js';

export type ParcelWithLocker = Parcel & {
  locker: Locker | null;
  business: Business;
  compartment: Pick<Compartment, 'id' | 'label' | 'size'> | null;
};

export type CustomerParcel = Parcel & {
  locker: Locker | null;
  business: Pick<Business, 'id' | 'name'>;
  compartment: Pick<Compartment, 'id' | 'label'> | null;
  pickupPin: PickupPin | null;
  deliveries: { status: DeliveryStatus }[];
};

export type GuestTrackCandidate = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  businessName: string;
  updatedAt: Date;
};

const ACTIVE_PIN_PARCEL_STATUSES: ParcelStatus[] = [
  'created',
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
];

async function allocateTrackingNumber(db: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const trackingNumber = generateTrackingNumber();
    const existing = await db.query(
      `SELECT id FROM parcels WHERE tracking_number = $1 LIMIT 1`,
      [trackingNumber],
    );
    if (!existing.rows[0]) return trackingNumber;
  }
  throw new Error('Impossible de générer un numéro de suivi unique');
}

async function allocatePickupPin(db: Queryable, lockerId: string | null): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generatePickupPinCode();
    if (lockerId) {
      const conflict = await db.query(
        `SELECT pp.id
         FROM pickup_pins pp
         INNER JOIN parcels p ON p.id = pp.parcel_id
         WHERE pp.code = $1
           AND p.locker_id = $2
           AND p.status = ANY($3)
         LIMIT 1`,
        [code, lockerId, ACTIVE_PIN_PARCEL_STATUSES],
      );
      if (conflict.rows[0]) continue;
    } else {
      const conflict = await db.query(`SELECT id FROM pickup_pins WHERE code = $1 LIMIT 1`, [code]);
      if (conflict.rows[0]) continue;
    }
    return code;
  }
  throw new Error('Impossible de générer un code PIN unique');
}

export type CreateParcelInput = {
  businessId: string;
  /** Merchant order reference (optional). */
  reference?: string | null;
  recipientPhone: string;
  recipientName?: string;
  recipientEmail?: string;
  customerId?: string;
  lockerId?: string;
  compartmentId?: string;
};

export type CreateParcelResult = {
  parcel: Parcel;
  recipientStatus: 'existing_user' | 'invited';
  invite?: {
    deepLink: string;
    webLink: string;
    expiresAt: string;
  };
};

export class ParcelRepository {
  private readonly businesses: BusinessRepository;
  private readonly lockers: LockerRepository;
  private readonly notifications: NotificationRepository;
  private readonly invites: ParcelInviteRepository;
  private readonly users: UserRepository;

  constructor(
    private readonly db: Queryable,
    notifications?: NotificationRepository,
    invites?: ParcelInviteRepository,
    users?: UserRepository,
  ) {
    this.businesses = new BusinessRepository(db);
    this.lockers = new LockerRepository(db);
    this.notifications = notifications ?? new NotificationRepository(db);
    this.invites = invites ?? new ParcelInviteRepository(db);
    this.users = users ?? new UserRepository(db);
  }

  async create(ctx: DataAccessContext, input: CreateParcelInput): Promise<CreateParcelResult> {
    assertBusinessScope(ctx, input.businessId);
    if (ctx.role === 'business') {
      await this.businesses.assertCanSubmitParcels(input.businessId);
    }

    const reference = input.reference?.trim() ? input.reference.trim() : null;
    const trackingNumber = await allocateTrackingNumber(this.db);

    if (input.compartmentId) {
      if (!input.lockerId) {
        throw new Error('Point requis pour réserver un compartiment');
      }

      const selectable = await this.lockers.assertSelectable(input.lockerId);
      if (selectable.type !== 'SMART_LOCKER') {
        throw new Error('Ce point ne dispose pas de compartiments');
      }

      const compartmentResult = await this.db.query(
        `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
        [input.compartmentId, input.lockerId],
      );
      const compartment = compartmentResult.rows[0];
      if (!compartment) {
        throw new Error('Compartiment introuvable pour ce point');
      }
      if (compartment.status !== 'available') {
        throw new Error('Compartiment indisponible');
      }

      const parcel = await withTransaction(async (tx) => {
        await tx.query(
          `UPDATE compartments SET status = 'reserved', updated_at = NOW() WHERE id = $1`,
          [compartment.id],
        );
        const created = await tx.query(
          `INSERT INTO parcels (
             business_id, tracking_number, reference, recipient_phone, recipient_name,
             customer_id, locker_id, compartment_id, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created')
           RETURNING *`,
          [
            input.businessId,
            trackingNumber,
            reference,
            input.recipientPhone,
            input.recipientName ?? null,
            input.customerId ?? null,
            input.lockerId,
            compartment.id,
          ],
        );
        return mapParcel(created.rows[0]!);
      });

      return this.finalizeCreate(parcel, input);
    }

    if (input.lockerId) {
      await this.lockers.assertSelectable(input.lockerId);
    }

    const created = await this.db.query(
      `INSERT INTO parcels (
         business_id, tracking_number, reference, recipient_phone, recipient_name,
         customer_id, locker_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'created')
       RETURNING *`,
      [
        input.businessId,
        trackingNumber,
        reference,
        input.recipientPhone,
        input.recipientName ?? null,
        input.customerId ?? null,
        input.lockerId ?? null,
      ],
    );

    return this.finalizeCreate(mapParcel(created.rows[0]!), input);
  }

  async linkParcelsForUser(userId: string, phone: string): Promise<void> {
    await this.db.query(
      `UPDATE parcels SET customer_id = $1, updated_at = NOW()
       WHERE recipient_phone = $2 AND customer_id IS NULL`,
      [userId, phone],
    );
  }

  private async finalizeCreate(parcel: Parcel, input: CreateParcelInput): Promise<CreateParcelResult> {
    const businessResult = await this.db.query(
      `SELECT name FROM businesses WHERE id = $1 LIMIT 1`,
      [input.businessId],
    );
    const businessRow = businessResult.rows[0];
    if (!businessRow) throw new Error(`Business ${input.businessId} not found`);
    const businessName = String(businessRow.name);

    const existingCustomer = await this.users.findCustomerByPhone(input.recipientPhone);

    if (existingCustomer) {
      await this.db.query(
        `UPDATE parcels SET customer_id = $1, updated_at = NOW() WHERE id = $2`,
        [existingCustomer.id, parcel.id],
      );

      await this.notifications.notifyParcelCreatedForCustomer(
        parcel.id,
        existingCustomer.id,
        businessName,
      );

      return {
        parcel: { ...parcel, customerId: existingCustomer.id },
        recipientStatus: 'existing_user',
      };
    }

    const invite = await this.invites.dispatchForNewParcel(
      parcel.id,
      input.recipientPhone,
      input.recipientEmail,
      businessName,
      parcel.trackingNumber,
    );

    return {
      parcel,
      recipientStatus: 'invited',
      invite: {
        deepLink: invite.deepLink,
        webLink: invite.webLink,
        expiresAt: invite.expiresAt,
      },
    };
  }

  async findById(ctx: DataAccessContext, id: string): Promise<ParcelWithLocker | null> {
    const parcel = await this.loadParcelWithRelations(id);
    if (!parcel) return null;
    this.assertReadAccess(ctx, parcel);
    return parcel;
  }

  async findByIdForCustomer(ctx: DataAccessContext, id: string): Promise<CustomerParcel | null> {
    assertCustomerRole(ctx);
    const parcel = await this.loadCustomerParcel(id);
    if (!parcel) return null;
    this.assertReadAccess(ctx, parcel);
    return parcel;
  }

  /**
   * Public guest lookup by Eveider tracking number (no account).
   */
  async findForGuestTrackingByNumber(trackingNumber: string): Promise<CustomerParcel | null> {
    const normalized = normalizeTrackingNumber(trackingNumber);
    const idsResult = await this.db.query(
      `SELECT id FROM parcels
       WHERE upper(tracking_number) = $1
       LIMIT 1`,
      [normalized],
    );
    const id = idsResult.rows[0]?.id;
    if (!id) return null;
    return this.loadCustomerParcel(String(id));
  }

  /**
   * Public guest lookup by recipient phone — may return multiple candidates.
   */
  async listForGuestTrackingByPhone(phone: string): Promise<GuestTrackCandidate[]> {
    const idsResult = await this.db.query(
      `SELECT p.id, p.tracking_number, p.reference, p.status, p.recipient_phone, p.updated_at,
              b.name AS business_name
       FROM parcels p
       INNER JOIN businesses b ON b.id = p.business_id
       ORDER BY p.updated_at DESC
       LIMIT 200`,
    );

    const candidates: GuestTrackCandidate[] = [];
    for (const row of idsResult.rows) {
      if (!phonesMatch(String(row.recipient_phone), phone)) continue;
      candidates.push({
        id: String(row.id),
        trackingNumber: String(row.tracking_number),
        reference: row.reference == null || row.reference === '' ? null : String(row.reference),
        status: row.status as ParcelStatus,
        businessName: String(row.business_name),
        updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
      });
      if (candidates.length >= 25) break;
    }
    return candidates;
  }

  /**
   * @deprecated Prefer findForGuestTrackingByNumber — kept for link compatibility (ref+phone).
   */
  async findForGuestTracking(reference: string, phone: string): Promise<CustomerParcel | null> {
    const ref = reference.trim();
    const idsResult = await this.db.query(
      `SELECT id FROM parcels
       WHERE lower(COALESCE(reference, '')) = lower($1)
          OR upper(tracking_number) = upper($1)
       ORDER BY updated_at DESC
       LIMIT 25`,
      [ref],
    );

    for (const row of idsResult.rows) {
      const parcel = await this.loadCustomerParcel(String(row.id));
      if (parcel && phonesMatch(parcel.recipientPhone, phone)) {
        return parcel;
      }
    }
    return null;
  }

  async findByIdForGuestTracking(parcelId: string, phone: string): Promise<CustomerParcel | null> {
    const parcel = await this.loadCustomerParcel(parcelId);
    if (!parcel || !phonesMatch(parcel.recipientPhone, phone)) return null;
    return parcel;
  }

  async listForBusiness(
    ctx: DataAccessContext,
    businessId: string,
    options?: { status?: ParcelStatus },
  ): Promise<ParcelWithLocker[]> {
    assertBusinessScope(ctx, businessId);
    const params: unknown[] = [businessId];
    let sql = `SELECT id FROM parcels WHERE business_id = $1`;
    if (options?.status) {
      params.push(options.status);
      sql += ` AND status = $2`;
    }
    sql += ` ORDER BY created_at DESC`;
    const ids = await this.db.query(sql, params);
    return this.loadParcelsWithRelations(ids.rows.map((r) => String(r.id)));
  }

  async listForCustomer(ctx: DataAccessContext): Promise<CustomerParcel[]> {
    assertCustomerRole(ctx);
    await this.linkParcelsByPhone(ctx);

    const params: unknown[] = [ctx.userId!];
    let sql = `SELECT id FROM parcels WHERE customer_id = $1`;
    if (ctx.phone) {
      params.push(ctx.phone);
      sql += ` OR recipient_phone = $2`;
    }
    sql += ` ORDER BY created_at DESC`;
    const ids = await this.db.query(sql, params);
    const parcels: CustomerParcel[] = [];
    for (const row of ids.rows) {
      const parcel = await this.loadCustomerParcel(String(row.id));
      if (parcel) parcels.push(parcel);
    }
    return parcels;
  }

  async listAll(
    ctx: DataAccessContext,
    options?: { status?: ParcelStatus },
  ): Promise<ParcelWithLocker[]> {
    assertAdmin(ctx);
    const params: unknown[] = [];
    let sql = `SELECT id FROM parcels`;
    if (options?.status) {
      params.push(options.status);
      sql += ` WHERE status = $1`;
    }
    sql += ` ORDER BY created_at DESC`;
    const ids = await this.db.query(sql, params);
    return this.loadParcelsWithRelations(ids.rows.map((r) => String(r.id)));
  }

  async listRecent(
    ctx: DataAccessContext,
    options?: { take?: number; status?: ParcelStatus },
  ): Promise<ParcelWithLocker[]> {
    assertAdmin(ctx);
    const take = options?.take ?? 20;
    const params: unknown[] = [];
    let sql = `SELECT id FROM parcels`;
    if (options?.status) {
      params.push(options.status);
      sql += ` WHERE status = $1`;
    }
    params.push(take);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const ids = await this.db.query(sql, params);
    return this.loadParcelsWithRelations(ids.rows.map((r) => String(r.id)));
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    nextStatus: ParcelStatus,
  ): Promise<Parcel> {
    const existing = await this.db.query(`SELECT * FROM parcels WHERE id = $1 LIMIT 1`, [id]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Parcel ${id} not found`);
    const parcel = mapParcel(row);
    this.assertWriteAccess(ctx, parcel);
    const status = transitionParcel(parcel.status, nextStatus);
    const updated = await this.db.query(
      `UPDATE parcels SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (nextStatus === 'ready_for_pickup') {
      await this.ensurePickupPin(id);
    }

    await this.notifications.notifyParcelStatusChange(id, nextStatus);

    return mapParcel(updated.rows[0]!);
  }

  async assignLockerByCustomer(
    ctx: DataAccessContext,
    parcelId: string,
    lockerId: string,
  ): Promise<CustomerParcel> {
    assertCustomerRole(ctx);

    const parcel = await this.loadCustomerParcel(parcelId);
    if (!parcel) {
      throw new Error('Colis introuvable');
    }

    this.assertReadAccess(ctx, parcel);

    if (parcel.status !== 'created') {
      throw new Error('Le point ne peut plus être modifié à ce stade');
    }

    if (parcel.lockerId) {
      throw new Error('Un point a déjà été choisi pour ce colis');
    }

    await this.lockers.assertSelectable(lockerId);

    await this.db.query(
      `UPDATE parcels SET locker_id = $1, updated_at = NOW() WHERE id = $2`,
      [lockerId, parcelId],
    );

    const updated = await this.loadCustomerParcel(parcelId);
    if (!updated) throw new Error(`Parcel ${parcelId} not found`);
    return updated;
  }

  private async loadParcelWithRelations(id: string): Promise<ParcelWithLocker | null> {
    const result = await this.db.query(
      `SELECT p.*,
              CASE WHEN l.id IS NULL THEN NULL ELSE row_to_json(l.*) END AS locker_row,
              row_to_json(b.*) AS business_row,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('id', c.id, 'label', c.label, 'size', c.size)
              END AS compartment_json
       FROM parcels p
       LEFT JOIN lockers l ON l.id = p.locker_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN compartments c ON c.id = p.compartment_id
       WHERE p.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapParcelWithRelations(row);
  }

  private async loadParcelsWithRelations(ids: string[]): Promise<ParcelWithLocker[]> {
    const parcels: ParcelWithLocker[] = [];
    for (const id of ids) {
      const parcel = await this.loadParcelWithRelations(id);
      if (parcel) parcels.push(parcel);
    }
    return parcels;
  }

  private mapParcelWithRelations(row: Record<string, unknown>): ParcelWithLocker {
    const lockerRow = row.locker_row as Record<string, unknown> | null;
    const businessRow = row.business_row as Record<string, unknown>;
    const compartmentJson = row.compartment_json as {
      id: string;
      label: string;
      size: Compartment['size'];
    } | null;

    return {
      ...mapParcel(row),
      locker: lockerRow ? mapLocker(lockerRow) : null,
      business: mapBusiness(businessRow),
      compartment: compartmentJson
        ? { id: String(compartmentJson.id), label: String(compartmentJson.label), size: compartmentJson.size }
        : null,
    };
  }

  private async loadCustomerParcel(id: string): Promise<CustomerParcel | null> {
    const result = await this.db.query(
      `SELECT p.*,
              CASE WHEN l.id IS NULL THEN NULL ELSE row_to_json(l.*) END AS locker_row,
              b.id AS business_relation_id, b.name AS business_name,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('id', c.id, 'label', c.label)
              END AS compartment_json,
              CASE WHEN pp.id IS NULL THEN NULL ELSE row_to_json(pp.*) END AS pickup_pin_row,
              (
                SELECT d.status FROM deliveries d
                WHERE d.parcel_id = p.id
                ORDER BY d.created_at DESC
                LIMIT 1
              ) AS latest_delivery_status
       FROM parcels p
       LEFT JOIN lockers l ON l.id = p.locker_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN compartments c ON c.id = p.compartment_id
       LEFT JOIN pickup_pins pp ON pp.parcel_id = p.id
       WHERE p.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;

    const lockerRow = row.locker_row as Record<string, unknown> | null;
    const pickupPinRow = row.pickup_pin_row as Record<string, unknown> | null;
    const compartmentJson = row.compartment_json as { id: string; label: string } | null;

    return {
      ...mapParcel(row),
      locker: lockerRow ? mapLocker(lockerRow) : null,
      business: {
        id: String(row.business_relation_id),
        name: String(row.business_name),
      },
      compartment: compartmentJson
        ? { id: String(compartmentJson.id), label: String(compartmentJson.label) }
        : null,
      pickupPin: pickupPinRow ? mapPickupPin(pickupPinRow) : null,
      deliveries: row.latest_delivery_status
        ? [{ status: row.latest_delivery_status as DeliveryStatus }]
        : [],
    };
  }

  private async linkParcelsByPhone(ctx: DataAccessContext): Promise<void> {
    if (!ctx.phone || !ctx.userId) return;
    await this.linkParcelsForUser(ctx.userId, ctx.phone);
  }

  private async ensurePickupPin(parcelId: string): Promise<void> {
    const existing = await this.db.query(
      `SELECT id FROM pickup_pins WHERE parcel_id = $1 LIMIT 1`,
      [parcelId],
    );
    if (existing.rows[0]) return;

    const parcelResult = await this.db.query(
      `SELECT locker_id FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const lockerId =
      parcelResult.rows[0]?.locker_id == null ? null : String(parcelResult.rows[0].locker_id);
    const code = await allocatePickupPin(this.db, lockerId);

    await this.db.query(
      `INSERT INTO pickup_pins (parcel_id, code) VALUES ($1, $2)`,
      [parcelId, code],
    );
  }

  private assertReadAccess(
    ctx: DataAccessContext,
    parcel: Pick<Parcel, 'businessId' | 'customerId' | 'recipientPhone'>,
  ): void {
    if (ctx.role === 'admin') return;
    if (ctx.role === 'business') {
      assertBusinessScope(ctx, parcel.businessId);
      return;
    }
    if (ctx.role === 'customer') {
      if (ctx.userId && parcel.customerId === ctx.userId) return;
      if (ctx.phone && parcel.recipientPhone === ctx.phone) return;
      throw new AccessDeniedError('Customer scope violation');
    }
    if (ctx.role === 'courier') {
      return;
    }
    throw new Error('Unsupported role for parcel read');
  }

  private assertWriteAccess(ctx: DataAccessContext, parcel: Parcel): void {
    if (ctx.role === 'admin' || ctx.role === 'courier') return;
    if (ctx.role === 'business') {
      assertBusinessScope(ctx, parcel.businessId);
      return;
    }
    throw new Error('Role cannot update parcel status');
  }
}
