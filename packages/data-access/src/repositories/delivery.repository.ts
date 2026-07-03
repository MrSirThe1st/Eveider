import {
  canAcceptDropOff,
  transitionDelivery,
  transitionParcel,
  type DeliveryStatus,
  type ParcelStatus,
} from '@eveider/domain';
import type { Business, Compartment, Delivery, Locker, Parcel, PrismaClient } from '@prisma/client';
import {
  AccessDeniedError,
  assertAdmin,
  assertCourierRole,
  type DataAccessContext,
} from '../context.js';
import { ParcelRepository } from './parcel.repository.js';
import { NotificationRepository } from './notification.repository.js';

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

const courierDeliveryInclude = {
  parcel: {
    include: {
      locker: true,
      business: { select: { id: true, name: true } },
      compartment: { select: { id: true, label: true } },
    },
  },
} as const;

const adminDeliveryInclude = {
  courier: { select: { id: true, fullName: true, email: true, phone: true } },
  parcel: {
    select: {
      id: true,
      reference: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      locker: { select: { id: true, name: true, address: true } },
      business: { select: { id: true, name: true } },
    },
  },
} as const;

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
    private readonly db: PrismaClient,
    notifications?: NotificationRepository,
  ) {
    const notificationRepo = notifications ?? new NotificationRepository(db);
    this.notifications = notificationRepo;
    this.parcels = new ParcelRepository(db, notificationRepo);
  }

  async assign(ctx: DataAccessContext, parcelId: string, courierId: string): Promise<Delivery> {
    assertAdmin(ctx);

    const parcel = await this.db.parcel.findUniqueOrThrow({ where: { id: parcelId } });
    if (!parcel.lockerId) {
      throw new Error('Le colis doit avoir un casier de destination avant assignation');
    }
    if (parcel.status !== 'created' && parcel.status !== 'in_transit') {
      throw new Error('Le colis ne peut pas recevoir de livraison à ce stade');
    }

    const courier = await this.db.user.findUniqueOrThrow({ where: { id: courierId } });
    if (courier.role !== 'courier') {
      throw new Error('Utilisateur non coursier');
    }

    const existing = await this.db.delivery.findFirst({
      where: { parcelId, status: { in: ACTIVE_DELIVERY_STATUSES } },
    });
    if (existing) {
      throw new Error('Une livraison active existe déjà pour ce colis');
    }

    return this.db.delivery.create({
      data: {
        parcelId,
        courierId,
        status: 'assigned',
      },
    });
  }

  findActiveForParcel(ctx: DataAccessContext, parcelId: string): Promise<ParcelDeliverySummary | null> {
    assertAdmin(ctx);
    return this.db.delivery.findFirst({
      where: { parcelId, status: { in: ACTIVE_DELIVERY_STATUSES } },
      include: {
        courier: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForAdmin(
    ctx: DataAccessContext,
    filters?: {
      status?: DeliveryStatus;
      courierId?: string;
      lockerId?: string;
      businessId?: string;
    },
  ): Promise<AdminDeliveryListItem[]> {
    assertAdmin(ctx);

    const statusFilter = filters?.status
      ? { status: filters.status }
      : { status: { in: ACTIVE_DELIVERY_STATUSES } };

    return this.db.delivery.findMany({
      where: {
        ...statusFilter,
        ...(filters?.courierId ? { courierId: filters.courierId } : {}),
        ...(filters?.lockerId ? { parcel: { lockerId: filters.lockerId } } : {}),
        ...(filters?.businessId ? { parcel: { businessId: filters.businessId } } : {}),
      },
      include: adminDeliveryInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getActiveSummary(ctx: DataAccessContext): Promise<ActiveDeliverySummary> {
    assertAdmin(ctx);

    const rows = await this.db.delivery.groupBy({
      by: ['status'],
      where: { status: { in: ACTIVE_DELIVERY_STATUSES } },
      _count: { id: true },
    });

    const counts = {
      assigned: 0,
      scanned: 0,
      drop_off_pending: 0,
    };

    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row._count.id;
      }
    }

    return {
      ...counts,
      total: counts.assigned + counts.scanned + counts.drop_off_pending,
    };
  }

  listForCourier(
    ctx: DataAccessContext,
    options?: { includeCompleted?: boolean },
  ): Promise<CourierDelivery[]> {
    assertCourierRole(ctx);

    const statusFilter = options?.includeCompleted
      ? undefined
      : { in: ACTIVE_DELIVERY_STATUSES };

    return this.db.delivery.findMany({
      where: {
        courierId: ctx.userId!,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: courierDeliveryInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForCourier(ctx: DataAccessContext, id: string): Promise<CourierDelivery | null> {
    assertCourierRole(ctx);

    const delivery = await this.db.delivery.findUnique({
      where: { id },
      include: courierDeliveryInclude,
    });
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
    await this.db.delivery.update({
      where: { id },
      data: { status, scannedAt: new Date() },
    });

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
    await this.db.delivery.update({ where: { id }, data: { status } });

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
        ? await this.db.pickupPin.findUnique({ where: { parcelId: parcel.id } })
        : null;

    const writes = [
      this.db.delivery.update({
        where: { id },
        data: { status: deliveryStatus, completedAt: new Date() },
      }),
      this.db.compartment.update({
        where: { id: compartment.id },
        data: { status: 'occupied' },
      }),
      this.db.parcel.update({
        where: { id: parcel.id },
        data: {
          status: parcelStatus,
          compartmentId: compartment.id,
        },
      }),
      ...(parcelStatus === 'ready_for_pickup' && !existingPin
        ? [
            this.db.pickupPin.create({
              data: { parcelId: parcel.id, code: generatePickupCode() },
            }),
          ]
        : []),
    ];

    // Sequential transaction API — compatible with Supabase PgBouncer (unlike interactive callbacks).
    await this.db.$transaction(writes);

    await this.notifications.notifyParcelStatusChange(parcel.id, 'ready_for_pickup');

    return this.findByIdForCourier(ctx, id) as Promise<CourierDelivery>;
  }

  private async reserveCompartment(lockerId: string, existingCompartmentId: string | null) {
    if (existingCompartmentId) {
      const compartment = await this.db.compartment.findFirstOrThrow({
        where: { id: existingCompartmentId, lockerId },
      });
      if (compartment.status !== 'available' && compartment.status !== 'reserved') {
        throw new Error('Compartiment assigné indisponible');
      }
      return compartment;
    }

    const compartment = await this.db.compartment.findFirst({
      where: { lockerId, status: 'available' },
      orderBy: { label: 'asc' },
    });
    if (!compartment) {
      throw new Error('Aucun compartiment disponible au casier');
    }
    return compartment;
  }

  private async requireCourierDelivery(ctx: DataAccessContext, id: string): Promise<CourierDelivery> {
    const delivery = await this.db.delivery.findUnique({
      where: { id },
      include: courierDeliveryInclude,
    });
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
