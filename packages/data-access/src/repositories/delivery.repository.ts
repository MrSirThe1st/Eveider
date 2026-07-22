import {
  canAcceptDropOff,
  transitionDelivery,
  transitionParcel,
  type DeliveryStatus,
  type ParcelStatus,
} from '@eveider/domain';
import {
  AccessDeniedError,
  assertAdmin,
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
import { ParcelRepository } from './parcel.repository.js';

export type CourierDelivery = Delivery & {
  parcel: Parcel & {
    locker: Locker | null;
    business: Pick<Business, 'id' | 'name'>;
    compartment: Pick<Compartment, 'id' | 'label'> | null;
  };
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
    reference: string;
    status: string;
    recipientName: string | null;
    recipientPhone: string;
    locker: { id: string; name: string; address: string } | null;
    business: { id: string; name: string };
  };
};

export type ActiveDeliverySummary = {
  assigned: number;
  scanned: number;
  drop_off_pending: number;
  total: number;
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
      reference: string;
      businessName: string;
      locker: { name: string; address: string } | null;
    };
  }>;
};

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'assigned',
  'scanned',
  'drop_off_pending',
];

function generatePickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeReference(reference: string): string {
  return reference.trim().toUpperCase();
}

export class DeliveryRepository {
  private readonly parcels: ParcelRepository;
  private readonly notifications: NotificationRepository;

  constructor(
    private readonly db: Queryable,
    notifications?: NotificationRepository,
  ) {
    const notificationRepo = notifications ?? new NotificationRepository(db);
    this.notifications = notificationRepo;
    this.parcels = new ParcelRepository(db, notificationRepo);
  }

  async assign(ctx: DataAccessContext, parcelId: string, courierId: string): Promise<Delivery> {
    assertAdmin(ctx);

    const parcelResult = await this.db.query(`SELECT * FROM parcels WHERE id = $1 LIMIT 1`, [
      parcelId,
    ]);
    const parcelRow = parcelResult.rows[0];
    if (!parcelRow) throw new Error(`Parcel ${parcelId} not found`);
    const parcel = mapParcel(parcelRow);

    if (!parcel.lockerId) {
      throw new Error('Le colis doit avoir un casier de destination avant assignation');
    }
    if (parcel.status !== 'created' && parcel.status !== 'in_transit') {
      throw new Error('Le colis ne peut pas recevoir de livraison à ce stade');
    }

    const courierResult = await this.db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [
      courierId,
    ]);
    const courier = courierResult.rows[0];
    if (!courier) throw new Error(`User ${courierId} not found`);
    if (courier.role !== 'courier') {
      throw new Error('Utilisateur non coursier');
    }

    const existing = await this.db.query(
      `SELECT id FROM deliveries
       WHERE parcel_id = $1 AND status = ANY($2)
       LIMIT 1`,
      [parcelId, ACTIVE_DELIVERY_STATUSES],
    );
    if (existing.rows[0]) {
      throw new Error('Une livraison active existe déjà pour ce colis');
    }

    const created = await this.db.query(
      `INSERT INTO deliveries (parcel_id, courier_id, status)
       VALUES ($1, $2, 'assigned')
       RETURNING *`,
      [parcelId, courierId],
    );
    return mapDelivery(created.rows[0]!);
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
       JOIN users u ON u.id = d.courier_id
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

  async listForAdmin(
    ctx: DataAccessContext,
    filters?: {
      status?: DeliveryStatus;
      courierId?: string;
      lockerId?: string;
      businessId?: string;
    },
  ): Promise<AdminDeliveryListItem[]> {
    assertAdmin(ctx);

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`d.status = $${params.length}`);
    } else {
      params.push(ACTIVE_DELIVERY_STATUSES);
      conditions.push(`d.status = ANY($${params.length})`);
    }

    if (filters?.courierId) {
      params.push(filters.courierId);
      conditions.push(`d.courier_id = $${params.length}`);
    }
    if (filters?.lockerId) {
      params.push(filters.lockerId);
      conditions.push(`p.locker_id = $${params.length}`);
    }
    if (filters?.businessId) {
      params.push(filters.businessId);
      conditions.push(`p.business_id = $${params.length}`);
    }

    const result = await this.db.query(
      `SELECT d.*,
              u.id AS courier_relation_id, u.full_name AS courier_full_name,
              u.email AS courier_email, u.phone AS courier_phone,
              p.id AS parcel_relation_id, p.reference AS parcel_reference,
              p.status AS parcel_status, p.recipient_name AS parcel_recipient_name,
              p.recipient_phone AS parcel_recipient_phone,
              l.id AS locker_relation_id, l.name AS locker_name, l.address AS locker_address,
              b.id AS business_relation_id, b.name AS business_name
       FROM deliveries d
       JOIN users u ON u.id = d.courier_id
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE ${conditions.join(' AND ')}
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
        reference: String(row.parcel_reference),
        status: String(row.parcel_status),
        recipientName:
          row.parcel_recipient_name == null ? null : String(row.parcel_recipient_name),
        recipientPhone: String(row.parcel_recipient_phone),
        locker: row.locker_relation_id
          ? {
              id: String(row.locker_relation_id),
              name: String(row.locker_name),
              address: String(row.locker_address),
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
      total: counts.assigned + counts.scanned + counts.drop_off_pending,
    };
  }

  async listForCourier(
    ctx: DataAccessContext,
    options?: { includeCompleted?: boolean },
  ): Promise<CourierDelivery[]> {
    assertCourierRole(ctx);

    const params: unknown[] = [ctx.userId!];
    let sql = `SELECT d.id FROM deliveries d WHERE d.courier_id = $1`;
    if (!options?.includeCompleted) {
      params.push(ACTIVE_DELIVERY_STATUSES);
      sql += ` AND d.status = ANY($2)`;
    }
    sql += ` ORDER BY d.created_at DESC`;

    const ids = await this.db.query(sql, params);
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

  async scan(ctx: DataAccessContext, id: string, reference: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'assigned') {
      throw new Error('La livraison n’est pas en attente de scan');
    }

    const expected = normalizeReference(delivery.parcel.reference);
    const provided = normalizeReference(reference);
    if (expected !== provided) {
      throw new Error('Référence colis incorrecte');
    }

    const status = transitionDelivery(delivery.status, 'scanned');
    await this.db.query(
      `UPDATE deliveries SET status = $1, scanned_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [status, id],
    );

    if (delivery.parcel.status === 'created') {
      await this.parcels.updateStatus(ctx, delivery.parcelId, 'in_transit');
    }

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  async markDropOffPending(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'scanned') {
      throw new Error('Scan requis avant le dépôt au casier');
    }

    const locker = delivery.parcel.locker;
    if (!locker) {
      throw new Error('Casier de destination manquant');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }

    const status = transitionDelivery(delivery.status, 'drop_off_pending');
    await this.db.query(
      `UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  async completeDropOff(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.requireCourierDelivery(ctx, id);
    if (delivery.status !== 'drop_off_pending') {
      throw new Error('Confirmation de dépôt non autorisée à ce stade');
    }

    const parcel = delivery.parcel;
    const locker = parcel.locker;
    if (!locker || !parcel.lockerId) {
      throw new Error('Casier de destination manquant');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }

    const compartment = await this.reserveCompartment(parcel.lockerId, parcel.compartmentId);

    const deliveryStatus = transitionDelivery(delivery.status, 'completed');

    let parcelStatus: ParcelStatus = parcel.status;
    if (parcelStatus === 'in_transit') {
      parcelStatus = transitionParcel(parcelStatus, 'delivered_to_locker');
    }
    if (parcelStatus === 'delivered_to_locker') {
      parcelStatus = transitionParcel(parcelStatus, 'ready_for_pickup');
    }

    const existingPin =
      parcelStatus === 'ready_for_pickup'
        ? await this.db.query(`SELECT id FROM pickup_pins WHERE parcel_id = $1 LIMIT 1`, [
            parcel.id,
          ])
        : null;

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries SET status = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [deliveryStatus, id],
      );
      await tx.query(
        `UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
        [compartment.id],
      );
      await tx.query(
        `UPDATE parcels SET status = $1, compartment_id = $2, updated_at = NOW() WHERE id = $3`,
        [parcelStatus, compartment.id, parcel.id],
      );
      if (parcelStatus === 'ready_for_pickup' && !existingPin?.rows[0]) {
        await tx.query(`INSERT INTO pickup_pins (parcel_id, code) VALUES ($1, $2)`, [
          parcel.id,
          generatePickupCode(),
        ]);
      }
    });

    await this.notifications.notifyParcelStatusChange(parcel.id, 'ready_for_pickup');

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
      `SELECT d.*,
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

    return {
      ...mapDelivery(row),
      parcel: {
        ...mapParcel(parcelRow),
        locker: lockerRow ? mapLocker(lockerRow) : null,
        business: {
          id: String(row.business_relation_id),
          name: String(row.business_name),
        },
        compartment: compartmentJson
          ? { id: String(compartmentJson.id), label: String(compartmentJson.label) }
          : null,
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
      `SELECT d.*,
              p.id AS parcel_relation_id,
              p.reference AS parcel_reference,
              b.name AS business_name,
              l.name AS locker_name,
              l.address AS locker_address
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE d.courier_id = $1
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
        reference: String(row.parcel_reference),
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
