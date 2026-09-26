import {
  ACTIVE_DELIVERY_STATUSES,
  canAcceptDropOff,
  completeOutboundDeliveryFromLocker,
  COURIER_HISTORY_DAYS,
  isAssignableDriverDossier,
  isCustomerReturnDeliveryKind,
  normalizeTrackingNumber,
  PRODUCT_LOCKS,
  transitionDelivery,
  transitionParcel,
  type DeliveryKind,
  type DeliveryStatus,
  type DriverDossierStatus,
  type LockerType,
  type ParcelStatus,
} from '@eveider/domain';
import { normalizeDropOffPhoto } from '../deliveries/drop-off-photo.js';
import {
  AccessDeniedError,
  assertAdmin,
  assertBusinessScope,
  assertBusinessRole,
  assertCompanyPermission,
  assertCourierRole,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import {
  mapCompartment,
  mapDelivery,
  mapLocker,
  mapParcel,
  mapUser,
} from '../db/mappers.js';
import type { Business, Compartment, Delivery, Locker, Parcel, User } from '../db/types.js';
import { NotificationRepository } from './notification.repository.js';
import {
  appendParcelEvent,
  resolveEventActor,
} from './parcel-event.repository.js';
import { syncParcelLockerRental } from './parcel-rental.js';
import { ParcelRepository } from './parcel.repository.js';
import { ParcelReturnRepository } from './parcel-return.repository.js';

export type CourierDelivery = Delivery & {
  hasDropOffPhoto: boolean;
  parcel: Parcel & {
    locker: Locker | null;
    business: Pick<Business, 'id' | 'name'>;
    compartment: Pick<Compartment, 'id' | 'label'> | null;
  };
};

export type CourierHistorySummary = {
  days: number;
  completed: number;
  failed: number;
  successRate: number;
};

export type ParcelDeliverySummary = Delivery & {
  courier: { id: string; fullName: string | null; email: string | null };
};

export type AdminDeliveryListItem = Delivery & {
  courier: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    recipientPhone: string;
    locker: { id: string; name: string; code: string; address: string } | null;
    compartment: { label: string; size: string } | null;
    business: { id: string; name: string };
  };
};

export type ActiveDeliverySummary = {
  assigned: number;
  accepted: number;
  started: number;
  scanned: number;
  drop_off_pending: number;
  total: number;
};

export type ClaimableParcel = {
  parcelId: string;
  kind: DeliveryKind;
  trackingNumber: string;
  reference: string | null;
  businessName: string;
  senderAddress: string | null;
  lockerName: string | null;
  lockerAddress: string | null;
  dueAt: Date | null;
  driverInstructions: string | null;
};

export type CourierAdminDetail = {
  courier: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'isBlocked' | 'createdAt'>;
  stats: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  deliveries: Array<{
    id: string;
    status: DeliveryStatus;
    createdAt: Date;
    completedAt: Date | null;
    parcel: {
      id: string;
      trackingNumber: string;
      reference: string | null;
      businessName: string;
      locker: { name: string; address: string } | null;
    };
  }>;
};

function normalizeScanCode(value: string): string {
  return normalizeTrackingNumber(value);
}

function mapClaimableRow(
  row: Record<string, unknown>,
  kind: DeliveryKind,
): ClaimableParcel {
  return {
    parcelId: String(row.parcel_id),
    kind,
    trackingNumber: String(row.tracking_number),
    reference: row.reference == null ? null : String(row.reference),
    businessName: String(row.business_name),
    senderAddress: row.sender_address == null ? null : String(row.sender_address),
    lockerName: row.locker_name == null ? null : String(row.locker_name),
    lockerAddress: row.locker_address == null ? null : String(row.locker_address),
    dueAt: row.due_at == null ? null : new Date(String(row.due_at)),
    driverInstructions:
      row.driver_instructions == null || row.driver_instructions === ''
        ? null
        : String(row.driver_instructions),
  };
}

export class DeliveryRepository {
  private readonly parcels: ParcelRepository;
  private readonly parcelReturns: ParcelReturnRepository;
  private readonly notifications: NotificationRepository;

  constructor(
    private readonly db: Queryable,
    notifications?: NotificationRepository,
  ) {
    const notificationRepo = notifications ?? new NotificationRepository(db);
    this.notifications = notificationRepo;
    this.parcels = new ParcelRepository(db, notificationRepo);
    this.parcelReturns = new ParcelReturnRepository(db);
  }

  async hasActiveForCourier(courierId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM deliveries
       WHERE driver_id = $1 AND status = ANY($2)
       LIMIT 1`,
      [courierId, ACTIVE_DELIVERY_STATUSES],
    );
    return Boolean(result.rows[0]);
  }

  async assign(
    ctx: DataAccessContext,
    parcelId: string,
    courierId: string,
    kind: DeliveryKind = 'outbound',
  ): Promise<Delivery> {
    if (ctx.role === 'business') {
      throw new AccessDeniedError(PRODUCT_LOCKS.orgDriverAssign);
    }
    assertAdmin(ctx);

    if (kind === 'return') {
      throw new Error(PRODUCT_LOCKS.legacyReturn);
    }
    if (isCustomerReturnDeliveryKind(kind)) {
      return this.assignCustomerReturn(ctx, parcelId, courierId);
    }

    const parcelResult = await this.db.query(`SELECT * FROM parcels WHERE id = $1 LIMIT 1`, [
      parcelId,
    ]);
    const parcelRow = parcelResult.rows[0];
    if (!parcelRow) throw new Error(`Parcel ${parcelId} not found`);
    const parcel = mapParcel(parcelRow);

    if (!parcel.lockerId) {
      throw new Error('Le colis doit avoir un casier de destination avant assignation');
    }

    const existing = await this.db.query(
      `SELECT id FROM deliveries
       WHERE parcel_id = $1 AND status = ANY($2)
       LIMIT 1`,
      [parcelId, ACTIVE_DELIVERY_STATUSES],
    );
    const hasActiveDelivery = Boolean(existing.rows[0]);
    if (hasActiveDelivery) {
      throw new Error('Une livraison active existe déjà pour ce colis');
    }

    if (parcel.status !== 'created' && parcel.status !== 'in_transit') {
      throw new Error('Le colis ne peut pas recevoir de livraison à ce stade');
    }
    if (parcel.pickupType === 'merchant_dropoff') {
      throw new Error('Assignation coursier indisponible pour un dépôt marchand');
    }

    const courierResult = await this.db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [
      courierId,
    ]);
    const courier = courierResult.rows[0];
    if (!courier) throw new Error(`User ${courierId} not found`);
    if (courier.role && courier.role !== 'courier' && courier.role !== 'driver') {
      throw new Error('Utilisateur non chauffeur');
    }
    if (courier.is_blocked || courier.deactivated_at || courier.deleted_at) {
      throw new Error('Ce chauffeur n’est pas assignable');
    }

    const dossierResult = await this.db.query(
      `SELECT status, business_id, contractor_type FROM driver_dossiers
       WHERE user_id = $1 AND status <> 'rejected'
       ORDER BY created_at DESC
       LIMIT 1`,
      [courierId],
    );
    const dossierRow = dossierResult.rows[0];
    const contractorType =
      dossierRow?.contractor_type === 'business' ? 'business' : 'eveider';
    if (contractorType !== 'eveider') {
      throw new Error(PRODUCT_LOCKS.eveiderDriversOnly);
    }
    if (
      !dossierRow ||
      !isAssignableDriverDossier(dossierRow.status as DriverDossierStatus, contractorType)
    ) {
      throw new Error('Ce chauffeur n’est pas encore approuvé');
    }

    const actor = resolveEventActor(ctx);
    const created = await this.db.query(
      `INSERT INTO deliveries (parcel_id, driver_id, status, kind)
       VALUES ($1, $2, 'assigned', $3)
       RETURNING *`,
      [parcelId, courierId, kind],
    );
    const delivery = mapDelivery(created.rows[0]!);
    await appendParcelEvent(this.db, {
      parcelId,
      deliveryId: delivery.id,
      eventType: 'delivery.assigned',
      actor,
      newDeliveryStatus: 'assigned',
      payload: { driverId: courierId, kind },
    });

    try {
      let lockerName: string | null = null;
      if (parcel.lockerId) {
        const locker = await this.db.query(`SELECT name FROM lockers WHERE id = $1 LIMIT 1`, [
          parcel.lockerId,
        ]);
        lockerName = locker.rows[0] ? String(locker.rows[0].name) : null;
      }
      const business = await this.db.query(`SELECT name FROM businesses WHERE id = $1 LIMIT 1`, [
        parcel.businessId,
      ]);
      const businessName = business.rows[0] ? String(business.rows[0].name) : null;
      await this.notifications.notifyCourierAssigned({
        courierId,
        deliveryId: delivery.id,
        parcelId: parcel.id,
        trackingNumber: parcel.trackingNumber,
        businessName,
        lockerName,
        kind: 'outbound',
      });
    } catch (error) {
      console.error('[eveider:notify] courier assignment failed', { parcelId, courierId, error });
    }

    if (kind === 'outbound') {
      try {
        await this.notifications.web.emit({
          type: 'delivery.driver_assigned',
          audience: 'business_web',
          businessId: parcel.businessId,
          title: 'Chauffeur assigné',
          message: `Un chauffeur a été assigné à ${parcel.trackingNumber}.`,
          entityType: 'parcel',
          entityId: parcel.id,
          parcelId: parcel.id,
          dedupeKey: `delivery.driver_assigned:${parcel.id}`,
        });
      } catch (error) {
        console.error('[eveider:web-notify] delivery.driver_assigned failed', error);
      }
    }

    return delivery;
  }

  private async assignCustomerReturn(
    ctx: DataAccessContext,
    parcelId: string,
    courierId: string,
  ): Promise<Delivery> {
    const returnMeta = await this.parcelReturns.assertAssignableCustomerReturn(parcelId);

    const existing = await this.db.query(
      `SELECT id FROM deliveries
       WHERE parcel_id = $1 AND status = ANY($2)
       LIMIT 1`,
      [parcelId, ACTIVE_DELIVERY_STATUSES],
    );
    if (existing.rows[0]) {
      throw new Error('Une livraison active existe déjà pour ce colis');
    }

    const courierResult = await this.db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [
      courierId,
    ]);
    const courier = courierResult.rows[0];
    if (!courier) throw new Error(`User ${courierId} not found`);
    if (courier.role && courier.role !== 'courier' && courier.role !== 'driver') {
      throw new Error('Utilisateur non chauffeur');
    }
    if (courier.is_blocked || courier.deactivated_at || courier.deleted_at) {
      throw new Error('Ce chauffeur n’est pas assignable');
    }

    const dossierResult = await this.db.query(
      `SELECT status, business_id, contractor_type FROM driver_dossiers
       WHERE user_id = $1 AND status <> 'rejected'
       ORDER BY created_at DESC
       LIMIT 1`,
      [courierId],
    );
    const dossierRow = dossierResult.rows[0];
    const contractorType =
      dossierRow?.contractor_type === 'business' ? 'business' : 'eveider';
    if (contractorType !== 'eveider') {
      throw new Error(PRODUCT_LOCKS.eveiderDriversOnly);
    }
    if (
      !dossierRow ||
      !isAssignableDriverDossier(dossierRow.status as DriverDossierStatus, contractorType)
    ) {
      throw new Error('Ce chauffeur n’est pas encore approuvé');
    }

    const actor = resolveEventActor(ctx);
    const created = await this.db.query(
      `INSERT INTO deliveries (parcel_id, driver_id, status, kind)
       VALUES ($1, $2, 'assigned', 'customer_return')
       RETURNING *`,
      [parcelId, courierId],
    );
    const delivery = mapDelivery(created.rows[0]!);
    await appendParcelEvent(this.db, {
      parcelId,
      deliveryId: delivery.id,
      eventType: 'delivery.assigned',
      actor,
      newDeliveryStatus: 'assigned',
      payload: { driverId: courierId, kind: 'customer_return' },
    });

    try {
      let lockerName: string | null = null;
      if (returnMeta.lockerId) {
        const locker = await this.db.query(`SELECT name FROM lockers WHERE id = $1 LIMIT 1`, [
          returnMeta.lockerId,
        ]);
        lockerName = locker.rows[0] ? String(locker.rows[0].name) : null;
      }
      const parcelRow = await this.db.query(
        `SELECT tracking_number FROM parcels WHERE id = $1 LIMIT 1`,
        [parcelId],
      );
      const trackingNumber = parcelRow.rows[0]
        ? String(parcelRow.rows[0].tracking_number)
        : parcelId;
      await this.notifications.notifyCourierAssigned({
        courierId,
        deliveryId: delivery.id,
        parcelId,
        trackingNumber,
        lockerName,
        kind: 'customer_return',
      });
    } catch (error) {
      console.error('[eveider:notify] return assignment failed', { parcelId, courierId, error });
    }

    return delivery;
  }

  async canCreateReturn(_ctx: DataAccessContext, _parcelId: string): Promise<boolean> {
    return false;
  }

  async findActiveForParcel(
    ctx: DataAccessContext,
    parcelId: string,
  ): Promise<ParcelDeliverySummary | null> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT d.*,
              u.id AS courier_relation_id,
              u.full_name AS courier_full_name,
              u.email AS courier_email
       FROM deliveries d
       JOIN users u ON u.id = d.driver_id
       WHERE d.parcel_id = $1 AND d.status = ANY($2)
       ORDER BY d.created_at DESC
       LIMIT 1`,
      [parcelId, ACTIVE_DELIVERY_STATUSES],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...mapDelivery(row),
      courier: {
        id: String(row.courier_relation_id),
        fullName: row.courier_full_name == null ? null : String(row.courier_full_name),
        email: row.courier_email == null ? null : String(row.courier_email),
      },
    };
  }

  async findActiveForBusinessParcel(
    ctx: DataAccessContext,
    businessId: string,
    parcelId: string,
  ): Promise<ParcelDeliverySummary | null> {
    assertBusinessScope(ctx, businessId);
    const result = await this.db.query(
      `SELECT d.*,
              u.id AS courier_relation_id,
              u.full_name AS courier_full_name,
              u.email AS courier_email
       FROM deliveries d
       JOIN users u ON u.id = d.driver_id
       JOIN parcels p ON p.id = d.parcel_id
       WHERE d.parcel_id = $1
         AND p.business_id = $2
         AND d.status = ANY($3)
       ORDER BY d.created_at DESC
       LIMIT 1`,
      [parcelId, businessId, ACTIVE_DELIVERY_STATUSES],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...mapDelivery(row),
      courier: {
        id: String(row.courier_relation_id),
        fullName: row.courier_full_name == null ? null : String(row.courier_full_name),
        email: row.courier_email == null ? null : String(row.courier_email),
      },
    };
  }

  async listForAdmin(
    ctx: DataAccessContext,
    filters?: {
      status?: DeliveryStatus;
      courierId?: string;
      lockerId?: string;
      businessId?: string;
      search?: string;
      includeAllStatuses?: boolean;
    },
  ): Promise<AdminDeliveryListItem[]> {
    assertAdmin(ctx);

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`d.status = $${params.length}`);
    } else if (!filters?.includeAllStatuses) {
      params.push(ACTIVE_DELIVERY_STATUSES);
      conditions.push(`d.status = ANY($${params.length})`);
    }

    if (filters?.courierId) {
      params.push(filters.courierId);
      conditions.push(`d.driver_id = $${params.length}`);
    }
    if (filters?.lockerId) {
      params.push(filters.lockerId);
      conditions.push(`p.locker_id = $${params.length}`);
    }
    if (filters?.businessId) {
      params.push(filters.businessId);
      conditions.push(`p.business_id = $${params.length}`);
    }
    if (filters?.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      conditions.push(
        `(p.tracking_number ILIKE $${params.length} OR COALESCE(p.reference, '') ILIKE $${params.length})`,
      );
    }

    const result = await this.db.query(
      `SELECT d.id, d.parcel_id, d.driver_id, d.status, d.kind,
              d.accepted_at, d.started_at, d.scanned_at, d.completed_at,
              d.created_at, d.updated_at,
              u.id AS courier_relation_id, u.full_name AS courier_full_name,
              u.email AS courier_email, u.phone AS courier_phone,
              p.id AS parcel_relation_id, p.tracking_number AS parcel_tracking_number,
              p.reference AS parcel_reference,
              p.status AS parcel_status, p.recipient_name AS parcel_recipient_name,
              p.recipient_phone AS parcel_recipient_phone,
              l.id AS locker_relation_id, l.name AS locker_name, l.code AS locker_code,
              l.address AS locker_address,
              c.label AS compartment_label, c.size AS compartment_size,
              b.id AS business_relation_id, b.name AS business_name
       FROM deliveries d
       JOIN users u ON u.id = d.driver_id
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       LEFT JOIN compartments c ON c.id = p.compartment_id
       WHERE ${conditions.length > 0 ? conditions.join(' AND ') : 'TRUE'}
       ORDER BY d.updated_at DESC`,
      params,
    );

    return result.rows.map((row) => ({
      ...mapDelivery(row),
      courier: {
        id: String(row.courier_relation_id),
        fullName: row.courier_full_name == null ? null : String(row.courier_full_name),
        email: row.courier_email == null ? null : String(row.courier_email),
        phone: row.courier_phone == null ? null : String(row.courier_phone),
      },
      parcel: {
        id: String(row.parcel_relation_id),
        trackingNumber: String(row.parcel_tracking_number),
        reference: row.parcel_reference == null || row.parcel_reference === ''
          ? null
          : String(row.parcel_reference),
        status: String(row.parcel_status),
        recipientName:
          row.parcel_recipient_name == null ? null : String(row.parcel_recipient_name),
        recipientPhone: String(row.parcel_recipient_phone),
        locker: row.locker_relation_id
          ? {
              id: String(row.locker_relation_id),
              name: String(row.locker_name),
              code: String(row.locker_code),
              address: String(row.locker_address),
            }
          : null,
        compartment: row.compartment_label
          ? {
              label: String(row.compartment_label),
              size: String(row.compartment_size),
            }
          : null,
        business: {
          id: String(row.business_relation_id),
          name: String(row.business_name),
        },
      },
    }));
  }

  async getActiveSummary(ctx: DataAccessContext): Promise<ActiveDeliverySummary> {
    assertAdmin(ctx);

    const rows = await this.db.query(
      `SELECT status, COUNT(*)::int AS count
       FROM deliveries
       WHERE status = ANY($1)
       GROUP BY status`,
      [ACTIVE_DELIVERY_STATUSES],
    );

    const counts = {
      assigned: 0,
      accepted: 0,
      started: 0,
      scanned: 0,
      drop_off_pending: 0,
    };

    for (const row of rows.rows) {
      const status = String(row.status);
      if (status in counts) {
        counts[status as keyof typeof counts] = Number(row.count);
      }
    }

    return {
      ...counts,
      total:
        counts.assigned +
        counts.accepted +
        counts.started +
        counts.scanned +
        counts.drop_off_pending,
    };
  }

  async listForCourier(ctx: DataAccessContext): Promise<CourierDelivery[]> {
    assertCourierRole(ctx);

    const ids = await this.db.query(
      `SELECT d.id FROM deliveries d
       WHERE d.driver_id = $1
         AND (
           d.status = ANY($2)
           OR d.updated_at >= NOW() - ($3::int * INTERVAL '1 day')
         )
       ORDER BY d.created_at DESC`,
      [ctx.userId!, ACTIVE_DELIVERY_STATUSES, COURIER_HISTORY_DAYS],
    );
    const deliveries: CourierDelivery[] = [];
    for (const row of ids.rows) {
      const delivery = await this.loadCourierDelivery(String(row.id));
      if (delivery) deliveries.push(delivery);
    }
    return deliveries;
  }

  async findByIdForCourier(ctx: DataAccessContext, id: string): Promise<CourierDelivery | null> {
    assertCourierRole(ctx);
    const delivery = await this.loadCourierDelivery(id);
    if (!delivery) return null;
    this.assertCourierOwns(ctx, delivery);
    return delivery;
  }

  async accept(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'assigned') {
      throw new Error('Cette livraison n’est pas en attente d’acceptation');
    }
    const status = transitionDelivery(delivery.status, 'accepted', delivery.kind);
    const actor = resolveEventActor(ctx);
    await this.db.query(
      `UPDATE deliveries
       SET status = $1, accepted_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [status, id],
    );
    await appendParcelEvent(this.db, {
      parcelId: delivery.parcelId,
      deliveryId: id,
      eventType: 'delivery.accepted',
      actor,
      previousDeliveryStatus: delivery.status,
      newDeliveryStatus: status,
    });
    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  async start(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'accepted') {
      throw new Error('Cette livraison n’est pas prête à commencer');
    }
    const status = transitionDelivery(delivery.status, 'started', delivery.kind);
    const actor = resolveEventActor(ctx);
    await this.db.query(
      `UPDATE deliveries
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [status, id],
    );
    await appendParcelEvent(this.db, {
      parcelId: delivery.parcelId,
      deliveryId: id,
      eventType: 'delivery.started',
      actor,
      previousDeliveryStatus: delivery.status,
      newDeliveryStatus: status,
    });
    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  /**
   * Confirm the driver is handling the correct parcel (barcode scan OR manual selection).
   * Transitions started → scanned ("prise en charge"). Scan is optional verification.
   */
  async confirmPickup(
    ctx: DataAccessContext,
    id: string,
    input: { mode: 'scan'; code: string } | { mode: 'manual' },
  ): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'started') {
      if (delivery.status === 'scanned') {
        return delivery;
      }
      throw new Error('Confirmez d’abord le démarrage de la livraison');
    }

    if (input.mode === 'scan') {
      const provided = normalizeScanCode(input.code);
      const expectedTracking = normalizeScanCode(delivery.parcel.trackingNumber);
      const expectedReference = delivery.parcel.reference
        ? normalizeScanCode(delivery.parcel.reference)
        : null;
      if (provided !== expectedTracking && provided !== expectedReference) {
        throw new Error('Numéro de suivi / référence incorrecte');
      }
    }

    if (isCustomerReturnDeliveryKind(delivery.kind)) {
      await this.parcelReturns.collectFromLocker(ctx, delivery);
      return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
    }

    const status = transitionDelivery(delivery.status, 'scanned', delivery.kind);
    const actor = resolveEventActor(ctx);
    await this.db.query(
      `UPDATE deliveries SET status = $1, scanned_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [status, id],
    );
    await appendParcelEvent(this.db, {
      parcelId: delivery.parcelId,
      deliveryId: id,
      eventType: 'delivery.scanned',
      actor,
      previousDeliveryStatus: delivery.status,
      newDeliveryStatus: status,
      payload: { confirmationMode: input.mode },
    });

    if (delivery.parcel.status === 'created' && delivery.parcel.pickupType !== 'merchant_dropoff') {
      await this.parcels.updateStatus(ctx, delivery.parcelId, 'in_transit');
    }

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  /** @deprecated Prefer confirmPickup — kept for API compatibility (scan mode). */
  async scan(ctx: DataAccessContext, id: string, scanCode: string): Promise<CourierDelivery> {
    return this.confirmPickup(ctx, id, { mode: 'scan', code: scanCode });
  }

  /**
   * Atomic self-claim: creates a delivery in ACCEPTED for eligible unassigned work.
   * Protected by deliveries_one_active_per_parcel_idx + parcel row lock.
   */
  async claim(
    ctx: DataAccessContext,
    parcelId: string,
    kind: DeliveryKind = 'outbound',
  ): Promise<CourierDelivery> {
    assertCourierRole(ctx);
    const driverId = ctx.userId!;

    if (kind === 'return') {
      throw new Error(PRODUCT_LOCKS.legacyReturn);
    }

    const settings = await this.db.query(
      `SELECT driver_self_assignment_enabled FROM platform_settings
       ORDER BY updated_at DESC LIMIT 1`,
    );
    if (!settings.rows[0]?.driver_self_assignment_enabled) {
      throw new Error('L’auto-attribution n’est pas activée');
    }

    const dossierResult = await this.db.query(
      `SELECT status, contractor_type, is_accepting_work FROM driver_dossiers
       WHERE user_id = $1 AND status <> 'rejected' AND status <> 'deleted'
       ORDER BY created_at DESC LIMIT 1`,
      [driverId],
    );
    const dossier = dossierResult.rows[0];
    if (!dossier) throw new Error('Dossier chauffeur introuvable');
    if (dossier.is_accepting_work === false) {
      throw new Error('Passez en Disponible pour prendre de nouvelles livraisons');
    }
    const contractorType = dossier.contractor_type === 'business' ? 'business' : 'eveider';
    if (contractorType !== 'eveider') {
      throw new Error(PRODUCT_LOCKS.eveiderDriversOnly);
    }
    if (!isAssignableDriverDossier(dossier.status as DriverDossierStatus, contractorType)) {
      throw new Error('Ce chauffeur n’est pas encore approuvé');
    }

    try {
      const deliveryId = await withTransaction(async (tx) => {
        const parcelResult = await tx.query(
          `SELECT * FROM parcels WHERE id = $1 FOR UPDATE`,
          [parcelId],
        );
        const parcelRow = parcelResult.rows[0];
        if (!parcelRow) throw new Error('Colis introuvable');
        const parcel = mapParcel(parcelRow);

        if (isCustomerReturnDeliveryKind(kind)) {
          const returnCheck = await tx.query(
            `SELECT pr.id, pr.status, pr.method, p.status AS parcel_status,
                    COALESCE(pr.return_locker_id, p.locker_id) AS locker_id
             FROM parcel_returns pr
             JOIN parcels p ON p.id = pr.parcel_id
             WHERE pr.parcel_id = $1
               AND pr.status = 'awaiting_pickup'
               AND pr.method = 'eveider_return'
               AND p.status = 'return_at_point'
             LIMIT 1
             FOR UPDATE OF pr`,
            [parcelId],
          );
          const returnRow = returnCheck.rows[0];
          if (!returnRow) {
            throw new Error('Aucun retour client assignable pour ce colis');
          }
          if (!returnRow.locker_id) {
            throw new Error('Le colis doit avoir un casier de destination');
          }
        } else {
          if (!parcel.lockerId) {
            throw new Error('Le colis doit avoir un casier de destination');
          }
          if (parcel.pickupType === 'merchant_dropoff') {
            throw new Error('Auto-attribution indisponible pour un dépôt marchand');
          }
          if (parcel.status !== 'created' && parcel.status !== 'in_transit') {
            throw new Error('Le colis ne peut pas recevoir de livraison à ce stade');
          }
        }

        const existing = await tx.query(
          `SELECT id FROM deliveries
           WHERE parcel_id = $1 AND status = ANY($2)
           LIMIT 1`,
          [parcelId, ACTIVE_DELIVERY_STATUSES],
        );
        if (existing.rows[0]) {
          throw new Error('Cette livraison n’est plus disponible');
        }

        const created = await tx.query(
          `INSERT INTO deliveries (parcel_id, driver_id, status, kind, accepted_at)
           VALUES ($1, $2, 'accepted', $3, NOW())
           RETURNING id`,
          [parcelId, driverId, kind],
        );
        const id = String(created.rows[0]!.id);
        const actor = resolveEventActor(ctx);
        await appendParcelEvent(tx, {
          parcelId,
          deliveryId: id,
          eventType: 'delivery.claimed',
          actor,
          newDeliveryStatus: 'accepted',
          payload: { driverId, kind },
        });
        return id;
      });

      const claimed = await this.findByIdForCourier(ctx, deliveryId);
      if (!claimed) throw new Error('Livraison introuvable après attribution');
      return claimed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('deliveries_one_active_per_parcel_idx') ||
        message.includes('unique') ||
        message.includes('duplicate')
      ) {
        throw new Error('Cette livraison n’est plus disponible');
      }
      throw error;
    }
  }

  /**
   * Parcels a driver can self-claim when platform self-assignment is on
   * and the driver is accepting work. Empty when gated off.
   */
  async listAvailableForClaim(ctx: DataAccessContext): Promise<ClaimableParcel[]> {
    assertCourierRole(ctx);

    const settings = await this.db.query(
      `SELECT driver_self_assignment_enabled FROM platform_settings
       ORDER BY updated_at DESC LIMIT 1`,
    );
    if (!settings.rows[0]?.driver_self_assignment_enabled) {
      return [];
    }

    const dossierResult = await this.db.query(
      `SELECT status, contractor_type, is_accepting_work FROM driver_dossiers
       WHERE user_id = $1 AND status <> 'rejected' AND status <> 'deleted'
       ORDER BY created_at DESC LIMIT 1`,
      [ctx.userId!],
    );
    const dossier = dossierResult.rows[0];
    if (!dossier || dossier.is_accepting_work === false) {
      return [];
    }
    const contractorType = dossier.contractor_type === 'business' ? 'business' : 'eveider';
    if (contractorType !== 'eveider') {
      return [];
    }
    if (!isAssignableDriverDossier(dossier.status as DriverDossierStatus, contractorType)) {
      return [];
    }

    const outbound = await this.db.query(
      `SELECT
         p.id AS parcel_id,
         'outbound'::text AS kind,
         p.tracking_number,
         p.reference,
         b.name AS business_name,
         p.sender_address,
         l.name AS locker_name,
         l.address AS locker_address,
         p.due_at,
         p.driver_instructions
       FROM parcels p
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE p.pickup_type = 'courier_pickup'
         AND p.status IN ('created', 'in_transit')
         AND p.locker_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM deliveries d
           WHERE d.parcel_id = p.id AND d.status = ANY($1)
         )
       ORDER BY p.due_at ASC NULLS LAST, p.created_at ASC
       LIMIT 50`,
      [ACTIVE_DELIVERY_STATUSES],
    );

    // Eligible Eveider customer-return pickups (same rules as admin assign).
    const returns = await this.db.query(
      `SELECT
         p.id AS parcel_id,
         'customer_return'::text AS kind,
         p.tracking_number,
         p.reference,
         b.name AS business_name,
         p.sender_address,
         COALESCE(rl.name, l.name) AS locker_name,
         COALESCE(rl.address, l.address) AS locker_address,
         p.due_at,
         p.driver_instructions
       FROM parcel_returns pr
       JOIN parcels p ON p.id = pr.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers rl ON rl.id = pr.return_locker_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE pr.status = 'awaiting_pickup'
         AND pr.method = 'eveider_return'
         AND p.status = 'return_at_point'
         AND COALESCE(pr.return_locker_id, p.locker_id) IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM deliveries d
           WHERE d.parcel_id = p.id AND d.status = ANY($1)
         )
       ORDER BY p.due_at ASC NULLS LAST, pr.updated_at ASC
       LIMIT 50`,
      [ACTIVE_DELIVERY_STATUSES],
    );

    const mapped: ClaimableParcel[] = [
      ...outbound.rows.map((row) => mapClaimableRow(row, 'outbound')),
      ...returns.rows.map((row) => mapClaimableRow(row, 'customer_return')),
    ];

    mapped.sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return 0;
    });

    return mapped.slice(0, 50);
  }

  async markDropOffPending(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (isCustomerReturnDeliveryKind(delivery.kind)) {
      throw new Error('Cette livraison se termine chez le marchand, pas au casier');
    }
    if (delivery.status !== 'scanned') {
      throw new Error(
        delivery.kind === 'return'
          ? 'Confirmez la prise en charge avant la remise au marchand'
          : 'Confirmez la prise en charge avant le dépôt au casier',
      );
    }

    const locker = delivery.parcel.locker;
    if (!locker) {
      throw new Error('Casier de destination manquant');
    }
    if (delivery.kind !== 'return' && !canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }

    const status = transitionDelivery(delivery.status, 'drop_off_pending');
    const actor = resolveEventActor(ctx);
    await this.db.query(
      `UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );
    await appendParcelEvent(this.db, {
      parcelId: delivery.parcelId,
      deliveryId: id,
      eventType: 'delivery.drop_off_pending',
      actor,
      previousDeliveryStatus: delivery.status,
      newDeliveryStatus: status,
      payload: { lockerId: locker.id },
    });

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  async completeDropOff(
    ctx: DataAccessContext,
    id: string,
    compartmentId?: string,
    photoBase64?: string,
  ): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (isCustomerReturnDeliveryKind(delivery.kind)) {
      await this.parcelReturns.completeToBusiness(ctx, delivery, photoBase64);
      return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
    }
    if (delivery.status !== 'drop_off_pending') {
      throw new Error('Confirmation de dépôt non autorisée à ce stade');
    }
    if (!photoBase64?.trim()) {
      throw new Error('Photo de dépôt requise');
    }
    const dropOffPhoto = normalizeDropOffPhoto(photoBase64);

    if (delivery.kind === 'return') {
      return this.completeReturnDropOff(ctx, delivery, dropOffPhoto);
    }

    const parcel = delivery.parcel;
    const locker = parcel.locker;
    if (!locker || !parcel.lockerId) {
      throw new Error('Casier de destination manquant');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }

    const compartment = await this.reserveCompartment(
      parcel.lockerId,
      compartmentId ?? parcel.compartmentId,
    );

    const deliveryStatus = transitionDelivery(delivery.status, 'completed');

    let parcelStatus: ParcelStatus = parcel.status;
    if (parcelStatus === 'in_transit' || parcelStatus === 'created') {
      parcelStatus = transitionParcel(parcelStatus, 'delivered_to_locker');
    }

    const actor = resolveEventActor(ctx);
    const previousParcelStatus = parcel.status;

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries SET status = $1, completed_at = NOW(), drop_off_photo = $2, updated_at = NOW()
         WHERE id = $3`,
        [deliveryStatus, dropOffPhoto, id],
      );
      await tx.query(
        `UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
        [compartment.id],
      );
      await tx.query(
        `UPDATE parcels
         SET status = $1,
             compartment_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [parcelStatus, compartment.id, parcel.id],
      );

      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        deliveryId: id,
        compartmentId: compartment.id,
        eventType: 'compartment.occupied',
        actor,
        payload: { lockerId: parcel.lockerId, compartmentLabel: compartment.label },
      });
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        deliveryId: id,
        compartmentId: compartment.id,
        eventType: 'delivery.completed',
        actor,
        previousDeliveryStatus: delivery.status,
        newDeliveryStatus: deliveryStatus,
        previousParcelStatus,
        newParcelStatus: parcelStatus,
        payload: { hasProof: true, lockerId: parcel.lockerId, kind: 'outbound' },
      });

      if (previousParcelStatus !== parcelStatus) {
        await appendParcelEvent(tx, {
          parcelId: parcel.id,
          deliveryId: id,
          eventType: 'parcel.status_changed',
          actor,
          previousParcelStatus,
          newParcelStatus: parcelStatus,
        });
      }
    });

    try {
      await this.emitBusinessDepositedAtLocker(parcel);
    } catch (error) {
      console.error('[eveider:web-notify] parcel.deposited_at_locker failed', error);
    }

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  /**
   * Hardware confirmation of Flow 1 Eveider outbound deposit.
   * Completes Livraison and occupies the reserved compartment without photo
   * or drop_off_pending. Does not prepare collection (AT_POINT only).
   */
  async confirmLockerOutboundDeposit(
    ctx: DataAccessContext,
    input: { deliveryId: string; compartmentId: string },
  ): Promise<void> {
    const delivery = await this.loadCourierDelivery(input.deliveryId);
    if (!delivery) throw new Error('Livraison introuvable');
    if (isCustomerReturnDeliveryKind(delivery.kind) || delivery.kind === 'return') {
      throw new Error('Cette livraison n’est pas un dépôt aller Eveider');
    }

    const parcel = delivery.parcel;
    if (delivery.status === 'completed' && parcel.status === 'delivered_to_locker') {
      return;
    }

    const deliveryStatus = completeOutboundDeliveryFromLocker(delivery.status);
    const locker = parcel.locker;
    if (!locker || !parcel.lockerId) {
      throw new Error('Casier de destination manquant');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }

    const compartmentResult = await this.db.query(
      `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
      [input.compartmentId, parcel.lockerId],
    );
    const compartmentRow = compartmentResult.rows[0];
    if (!compartmentRow) throw new Error('Compartiment introuvable');
    const compartment = mapCompartment(compartmentRow);
    if (compartment.status !== 'reserved' && compartment.status !== 'available' && compartment.status !== 'occupied') {
      throw new Error('Compartiment indisponible');
    }

    let parcelStatus: ParcelStatus = parcel.status;
    if (parcelStatus === 'in_transit' || parcelStatus === 'created') {
      parcelStatus = transitionParcel(parcelStatus, 'delivered_to_locker');
    }
    const actor = resolveEventActor(ctx);
    const previousParcelStatus = parcel.status;

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [deliveryStatus, delivery.id],
      );
      await tx.query(
        `UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
        [compartment.id],
      );
      await tx.query(
        `UPDATE parcels SET status = $1, compartment_id = $2, updated_at = NOW() WHERE id = $3`,
        [parcelStatus, compartment.id, parcel.id],
      );
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        deliveryId: delivery.id,
        compartmentId: compartment.id,
        eventType: 'compartment.occupied',
        actor,
        payload: { lockerId: parcel.lockerId, compartmentLabel: compartment.label, source: 'locker_confirm' },
      });
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        deliveryId: delivery.id,
        compartmentId: compartment.id,
        eventType: 'delivery.completed',
        actor,
        previousDeliveryStatus: delivery.status,
        newDeliveryStatus: deliveryStatus,
        previousParcelStatus,
        newParcelStatus: parcelStatus,
        payload: { lockerId: parcel.lockerId, kind: 'outbound', source: 'locker_confirm' },
      });
      if (previousParcelStatus !== parcelStatus) {
        await appendParcelEvent(tx, {
          parcelId: parcel.id,
          deliveryId: delivery.id,
          eventType: 'parcel.status_changed',
          actor,
          previousParcelStatus,
          newParcelStatus: parcelStatus,
        });
      }
    });

    if (previousParcelStatus !== parcelStatus && parcelStatus === 'delivered_to_locker') {
      await this.emitBusinessDepositedAtLocker(parcel);
    }
  }

  private async emitBusinessDepositedAtLocker(
    parcel: Pick<Parcel, 'id' | 'businessId' | 'trackingNumber'>,
  ): Promise<void> {
    try {
      await this.notifications.web.emit({
        type: 'parcel.deposited_at_locker',
        audience: 'business_web',
        businessId: parcel.businessId,
        title: 'Colis déposé au casier',
        message: `${parcel.trackingNumber} est arrivé au point Eveider.`,
        entityType: 'parcel',
        entityId: parcel.id,
        parcelId: parcel.id,
        dedupeKey: `parcel.deposited_at_locker:${parcel.id}`,
      });
    } catch (error) {
      console.error('[eveider:web-notify] parcel.deposited_at_locker failed', error);
    }
  }

  /**
   * Return leg completion: courier hands the parcel back to the merchant.
   * Releases the locker compartment and invalidates the customer PIN.
   * Parcel status stays as-is (no `returned` enum); business location derives from delivery kind.
   */
  private async completeReturnDropOff(
    ctx: DataAccessContext,
    delivery: CourierDelivery,
    dropOffPhoto: string,
  ): Promise<CourierDelivery> {
    const parcel = delivery.parcel;
    const deliveryStatus = transitionDelivery(delivery.status, 'completed');
    const actor = resolveEventActor(ctx);
    const compartmentId = parcel.compartmentId;
    const removedAt = new Date();

    // Load ready_for_pickup_at for rental finalization
    const readyResult = await this.db.query(
      `SELECT ready_for_pickup_at FROM parcels WHERE id = $1 LIMIT 1`,
      [parcel.id],
    );
    const readyForPickupAt =
      readyResult.rows[0]?.ready_for_pickup_at == null
        ? null
        : new Date(String(readyResult.rows[0].ready_for_pickup_at));

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries SET status = $1, completed_at = NOW(), drop_off_photo = $2, updated_at = NOW()
         WHERE id = $3`,
        [deliveryStatus, dropOffPhoto, delivery.id],
      );

      if (compartmentId) {
        await tx.query(
          `UPDATE compartments SET status = 'available', updated_at = NOW() WHERE id = $1`,
          [compartmentId],
        );
        await appendParcelEvent(tx, {
          parcelId: parcel.id,
          deliveryId: delivery.id,
          compartmentId,
          eventType: 'compartment.released',
          actor,
          payload: { lockerId: parcel.lockerId, kind: 'return' },
        });
      }

      await tx.query(
        `UPDATE parcels SET compartment_id = NULL, updated_at = NOW() WHERE id = $1`,
        [parcel.id],
      );
      await tx.query(`DELETE FROM pickup_pins WHERE parcel_id = $1`, [parcel.id]);

      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        deliveryId: delivery.id,
        compartmentId,
        eventType: 'delivery.completed',
        actor,
        previousDeliveryStatus: delivery.status,
        newDeliveryStatus: deliveryStatus,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcel.status,
        payload: { hasProof: true, kind: 'return', lockerId: parcel.lockerId, pinInvalidated: true },
      });

      await syncParcelLockerRental(tx, {
        parcelId: parcel.id,
        businessId: parcel.business.id,
        readyForPickupAt,
        endAt: removedAt,
        lockerType: (parcel.locker?.type as LockerType | undefined) ?? null,
        compartmentId,
        finalize: true,
      });
    });

    return this.findByIdForCourier(ctx, delivery.id) as Promise<CourierDelivery>;
  }

  async getDropOffPhoto(ctx: DataAccessContext, id: string): Promise<string | null> {
    await this.requireCourierDelivery(ctx, id);
    const result = await this.db.query(
      `SELECT drop_off_photo FROM deliveries WHERE id = $1 LIMIT 1`,
      [id],
    );
    const photo = result.rows[0]?.drop_off_photo;
    return photo == null || photo === '' ? null : String(photo);
  }

  async getCourierHistorySummary(ctx: DataAccessContext): Promise<CourierHistorySummary> {
    assertCourierRole(ctx);
    const result = await this.db.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status = 'completed'
             AND COALESCE(completed_at, updated_at) >= NOW() - ($2::int * INTERVAL '1 day')
         )::int AS completed,
         COUNT(*) FILTER (
           WHERE status = 'failed'
             AND updated_at >= NOW() - ($2::int * INTERVAL '1 day')
         )::int AS failed
       FROM deliveries
       WHERE driver_id = $1`,
      [ctx.userId!, COURIER_HISTORY_DAYS],
    );
    const completed = Number(result.rows[0]?.completed ?? 0);
    const failed = Number(result.rows[0]?.failed ?? 0);
    const total = completed + failed;
    return {
      days: COURIER_HISTORY_DAYS,
      completed,
      failed,
      successRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }

  async fail(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    const status = transitionDelivery(delivery.status, 'failed');
    const actor = resolveEventActor(ctx);
    await this.db.query(`UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2`, [
      status,
      id,
    ]);
    await appendParcelEvent(this.db, {
      parcelId: delivery.parcelId,
      deliveryId: id,
      eventType: 'delivery.failed',
      actor,
      previousDeliveryStatus: delivery.status,
      newDeliveryStatus: status,
    });
    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  private async reserveCompartment(lockerId: string, existingCompartmentId: string | null) {
    if (existingCompartmentId) {
      const result = await this.db.query(
        `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
        [existingCompartmentId, lockerId],
      );
      const row = result.rows[0];
      if (!row) throw new Error(`Compartment ${existingCompartmentId} not found`);
      const compartment = mapCompartment(row);
      if (compartment.status !== 'available' && compartment.status !== 'reserved') {
        throw new Error('Compartiment assigné indisponible');
      }
      return compartment;
    }

    const result = await this.db.query(
      `SELECT * FROM compartments
       WHERE locker_id = $1 AND status = 'available'
       ORDER BY label ASC
       LIMIT 1`,
      [lockerId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Aucun compartiment disponible au casier');
    }
    return mapCompartment(row);
  }

  private async loadCourierDelivery(id: string): Promise<CourierDelivery | null> {
    const result = await this.db.query(
      `SELECT d.id, d.parcel_id, d.driver_id, d.status, d.kind,
              d.accepted_at, d.started_at, d.scanned_at, d.completed_at,
              d.created_at, d.updated_at,
              (d.drop_off_photo IS NOT NULL AND d.drop_off_photo <> '') AS has_drop_off_photo,
              CASE WHEN l.id IS NULL THEN NULL ELSE row_to_json(l.*) END AS locker_row,
              b.id AS business_relation_id, b.name AS business_name,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('id', c.id, 'label', c.label)
              END AS compartment_json,
              row_to_json(p.*) AS parcel_row
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       LEFT JOIN compartments c ON c.id = p.compartment_id
       WHERE d.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;

    const parcelRow = row.parcel_row as Record<string, unknown>;
    const lockerRow = row.locker_row as Record<string, unknown> | null;
    const compartmentJson = row.compartment_json as { id: string; label: string } | null;
    const delivery = mapDelivery(row);

    let compartment = compartmentJson
      ? { id: String(compartmentJson.id), label: String(compartmentJson.label) }
      : null;

    if (!compartment && delivery.kind !== 'return' && delivery.status === 'drop_off_pending' && lockerRow) {
      const suggested = await this.db.query(
        `SELECT id, label FROM compartments
         WHERE locker_id = $1 AND status = 'available'
         ORDER BY label ASC
         LIMIT 1`,
        [String(lockerRow.id)],
      );
      const suggestedRow = suggested.rows[0];
      if (suggestedRow) {
        compartment = { id: String(suggestedRow.id), label: String(suggestedRow.label) };
      }
    }

    return {
      ...delivery,
      hasDropOffPhoto: Boolean(row.has_drop_off_photo),
      parcel: {
        ...mapParcel(parcelRow),
        locker: lockerRow ? mapLocker(lockerRow) : null,
        business: {
          id: String(row.business_relation_id),
          name: String(row.business_name),
        },
        compartment,
      },
    };
  }

  async getCourierAdminDetail(
    ctx: DataAccessContext,
    courierId: string,
  ): Promise<CourierAdminDetail | null> {
    assertAdmin(ctx);

    const courierResult = await this.db.query(
      `SELECT * FROM users WHERE id = $1 AND role = 'courier' LIMIT 1`,
      [courierId],
    );
    const courierRow = courierResult.rows[0];
    if (!courierRow) return null;

    const courier = mapUser(courierRow);
    const deliveriesResult = await this.db.query(
      `SELECT d.id, d.status, d.created_at, d.completed_at,
              p.id AS parcel_relation_id,
              p.tracking_number AS parcel_tracking_number,
              p.reference AS parcel_reference,
              b.name AS business_name,
              l.name AS locker_name,
              l.address AS locker_address
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE d.driver_id = $1
       ORDER BY d.created_at DESC`,
      [courierId],
    );

    const deliveries = deliveriesResult.rows.map((row) => ({
      id: String(row.id),
      status: row.status as DeliveryStatus,
      createdAt: new Date(String(row.created_at)),
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
      parcel: {
        id: String(row.parcel_relation_id),
        trackingNumber: String(row.parcel_tracking_number),
        reference: row.parcel_reference == null || row.parcel_reference === ''
          ? null
          : String(row.parcel_reference),
        businessName: String(row.business_name),
        locker: row.locker_name
          ? {
              name: String(row.locker_name),
              address: String(row.locker_address),
            }
          : null,
      },
    }));

    const stats = {
      total: deliveries.length,
      completed: deliveries.filter((d) => d.status === 'completed').length,
      failed: deliveries.filter((d) => d.status === 'failed').length,
      inProgress: deliveries.filter((d) =>
        ACTIVE_DELIVERY_STATUSES.includes(d.status),
      ).length,
    };

    return {
      courier: {
        id: courier.id,
        fullName: courier.fullName,
        email: courier.email,
        phone: courier.phone,
        isBlocked: courier.isBlocked,
        createdAt: courier.createdAt,
      },
      stats,
      deliveries,
    };
  }

  async listForBusinessDriver(
    ctx: DataAccessContext,
    driverUserId: string,
  ): Promise<
    Array<{
      id: string;
      status: DeliveryStatus;
      createdAt: Date;
      completedAt: Date | null;
      trackingNumber: string;
      reference: string | null;
      lockerName: string | null;
      lockerAddress: string | null;
    }>
  > {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_couriers');
    const result = await this.db.query(
      `SELECT d.id, d.status, d.created_at, d.completed_at,
              p.tracking_number, p.reference,
              l.name AS locker_name, l.address AS locker_address
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE d.driver_id = $1 AND p.business_id = $2
       ORDER BY d.created_at DESC`,
      [driverUserId, ctx.businessId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      status: row.status as DeliveryStatus,
      createdAt: new Date(String(row.created_at)),
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
      trackingNumber: String(row.tracking_number),
      reference:
        row.reference == null || row.reference === '' ? null : String(row.reference),
      lockerName: row.locker_name == null ? null : String(row.locker_name),
      lockerAddress: row.locker_address == null ? null : String(row.locker_address),
    }));
  }

  async listForAdminDriver(
    ctx: DataAccessContext,
    driverUserId: string,
  ): Promise<
    Array<{
      id: string;
      status: DeliveryStatus;
      kind: DeliveryKind;
      createdAt: Date;
      completedAt: Date | null;
      trackingNumber: string;
      reference: string | null;
      lockerName: string | null;
      lockerAddress: string | null;
      businessName: string | null;
    }>
  > {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT d.id, d.status, d.kind, d.created_at, d.completed_at,
              p.tracking_number, p.reference,
              l.name AS locker_name, l.address AS locker_address,
              b.name AS business_name
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE d.driver_id = $1
       ORDER BY d.created_at DESC`,
      [driverUserId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      status: row.status as DeliveryStatus,
      kind: (row.kind as DeliveryKind) ?? 'outbound',
      createdAt: new Date(String(row.created_at)),
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
      trackingNumber: String(row.tracking_number),
      reference:
        row.reference == null || row.reference === '' ? null : String(row.reference),
      lockerName: row.locker_name == null ? null : String(row.locker_name),
      lockerAddress: row.locker_address == null ? null : String(row.locker_address),
      businessName: row.business_name == null ? null : String(row.business_name),
    }));
  }

  private async requireCourierDelivery(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.loadCourierDelivery(id);
    if (!delivery) {
      throw new Error('Livraison introuvable');
    }
    this.assertCourierOwns(ctx, delivery);
    return delivery;
  }

  private assertCourierOwns(ctx: DataAccessContext, delivery: Pick<Delivery, 'courierId'>): void {
    assertCourierRole(ctx);
    if (delivery.courierId !== ctx.userId) {
      throw new AccessDeniedError('Livraison hors périmètre coursier');
    }
  }
}
