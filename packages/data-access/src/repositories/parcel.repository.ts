import { transitionParcel, type ParcelStatus } from '@eveider/domain';
import type { Business, Compartment, Locker, Parcel, PickupPin, PrismaClient } from '@prisma/client';
import {
  assertAdmin,
  assertBusinessScope,
  assertCustomerRole,
  AccessDeniedError,
  type DataAccessContext,
} from '../context.js';
import { BusinessRepository } from './business.repository.js';
import { NotificationRepository } from './notification.repository.js';
import { ParcelInviteRepository } from './parcel-invite.repository.js';
import { UserRepository } from './user.repository.js';

export type ParcelWithLocker = Parcel & { locker: Locker | null; business: Business };

export type CustomerParcel = Parcel & {
  locker: Locker | null;
  business: Pick<Business, 'id' | 'name'>;
  compartment: Pick<Compartment, 'id' | 'label'> | null;
  pickupPin: PickupPin | null;
  deliveries: { status: import('@prisma/client').DeliveryStatus }[];
};

const parcelRelationsInclude = {
  locker: true,
  business: true,
  compartment: { select: { id: true, label: true, size: true } },
} as const;

const customerParcelInclude = {
  locker: true,
  business: { select: { id: true, name: true } },
  compartment: { select: { id: true, label: true } },
  pickupPin: true,
  deliveries: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { status: true },
  },
} as const;

function generatePickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type CreateParcelInput = {
  businessId: string;
  reference: string;
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
  private readonly notifications: NotificationRepository;
  private readonly invites: ParcelInviteRepository;
  private readonly users: UserRepository;

  constructor(
    private readonly db: PrismaClient,
    notifications?: NotificationRepository,
    invites?: ParcelInviteRepository,
    users?: UserRepository,
  ) {
    this.businesses = new BusinessRepository(db);
    this.notifications = notifications ?? new NotificationRepository(db);
    this.invites = invites ?? new ParcelInviteRepository(db);
    this.users = users ?? new UserRepository(db);
  }

  async create(ctx: DataAccessContext, input: CreateParcelInput): Promise<CreateParcelResult> {
    assertBusinessScope(ctx, input.businessId);
    if (ctx.role === 'business') {
      await this.businesses.assertCanSubmitParcels(input.businessId);
    }

    if (input.compartmentId) {
      if (!input.lockerId) {
        throw new Error('Casier requis pour réserver un compartiment');
      }

      const compartment = await this.db.compartment.findFirst({
        where: { id: input.compartmentId, lockerId: input.lockerId },
      });

      if (!compartment) {
        throw new Error('Compartiment introuvable pour ce casier');
      }

      if (compartment.status !== 'available') {
        throw new Error('Compartiment indisponible');
      }

      const [, parcel] = await this.db.$transaction([
        this.db.compartment.update({
          where: { id: compartment.id },
          data: { status: 'reserved' },
        }),
        this.db.parcel.create({
          data: {
            businessId: input.businessId,
            reference: input.reference,
            recipientPhone: input.recipientPhone,
            recipientName: input.recipientName,
            customerId: input.customerId,
            lockerId: input.lockerId,
            compartmentId: compartment.id,
            status: 'created',
          },
        }),
      ]);

      return this.finalizeCreate(parcel, input);
    }

    if (input.lockerId) {
      const locker = await this.db.locker.findUnique({ where: { id: input.lockerId } });
      if (!locker || locker.status !== 'active') {
        throw new Error('Casier indisponible');
      }

      const availableCompartments = await this.db.compartment.count({
        where: { lockerId: input.lockerId, status: 'available' },
      });

      if (availableCompartments === 0) {
        throw new Error('Aucun compartiment disponible à ce casier');
      }
    }

    const parcel = await this.db.parcel.create({
      data: {
        businessId: input.businessId,
        reference: input.reference,
        recipientPhone: input.recipientPhone,
        recipientName: input.recipientName,
        customerId: input.customerId,
        lockerId: input.lockerId,
        status: 'created',
      },
    });

    return this.finalizeCreate(parcel, input);
  }

  async linkParcelsForUser(userId: string, phone: string): Promise<void> {
    await this.db.parcel.updateMany({
      where: { recipientPhone: phone, customerId: null },
      data: { customerId: userId },
    });
  }

  private async finalizeCreate(parcel: Parcel, input: CreateParcelInput): Promise<CreateParcelResult> {
    const business = await this.db.business.findUniqueOrThrow({
      where: { id: input.businessId },
      select: { name: true },
    });

    const existingCustomer = await this.users.findCustomerByPhone(input.recipientPhone);

    if (existingCustomer) {
      await this.db.parcel.update({
        where: { id: parcel.id },
        data: { customerId: existingCustomer.id },
      });

      await this.notifications.notifyParcelCreatedForCustomer(
        parcel.id,
        existingCustomer.id,
        business.name,
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
      business.name,
      parcel.reference,
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
    const parcel = await this.db.parcel.findUnique({
      where: { id },
      include: parcelRelationsInclude,
    });
    if (!parcel) return null;
    this.assertReadAccess(ctx, parcel);
    return parcel;
  }

  async findByIdForCustomer(ctx: DataAccessContext, id: string): Promise<CustomerParcel | null> {
    assertCustomerRole(ctx);

    const parcel = await this.db.parcel.findUnique({
      where: { id },
      include: customerParcelInclude,
    });
    if (!parcel) return null;
    this.assertReadAccess(ctx, parcel);
    return parcel;
  }

  listForBusiness(
    ctx: DataAccessContext,
    businessId: string,
    options?: { status?: ParcelStatus },
  ): Promise<ParcelWithLocker[]> {
    assertBusinessScope(ctx, businessId);
    return this.db.parcel.findMany({
      where: {
        businessId,
        ...(options?.status ? { status: options.status } : {}),
      },
      include: parcelRelationsInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForCustomer(ctx: DataAccessContext): Promise<CustomerParcel[]> {
    assertCustomerRole(ctx);
    await this.linkParcelsByPhone(ctx);

    return this.db.parcel.findMany({
      where: this.customerWhereClause(ctx),
      include: customerParcelInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll(
    ctx: DataAccessContext,
    options?: { status?: ParcelStatus },
  ): Promise<ParcelWithLocker[]> {
    assertAdmin(ctx);
    return this.db.parcel.findMany({
      where: options?.status ? { status: options.status } : undefined,
      include: parcelRelationsInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    nextStatus: ParcelStatus,
  ): Promise<Parcel> {
    const parcel = await this.db.parcel.findUniqueOrThrow({ where: { id } });
    this.assertWriteAccess(ctx, parcel);
    const status = transitionParcel(parcel.status, nextStatus);
    const updated = await this.db.parcel.update({ where: { id }, data: { status } });

    if (nextStatus === 'ready_for_pickup') {
      await this.ensurePickupPin(id);
    }

    await this.notifications.notifyParcelStatusChange(id, nextStatus);

    return updated;
  }

  async assignLockerByCustomer(
    ctx: DataAccessContext,
    parcelId: string,
    lockerId: string,
  ): Promise<CustomerParcel> {
    assertCustomerRole(ctx);

    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      include: customerParcelInclude,
    });

    if (!parcel) {
      throw new Error('Colis introuvable');
    }

    this.assertReadAccess(ctx, parcel);

    if (parcel.status !== 'created') {
      throw new Error('Le casier ne peut plus être modifié à ce stade');
    }

    if (parcel.lockerId) {
      throw new Error('Un casier a déjà été choisi pour ce colis');
    }

    const locker = await this.db.locker.findUniqueOrThrow({ where: { id: lockerId } });
    if (locker.status !== 'active') {
      throw new Error('Casier indisponible');
    }

    const availableCompartments = await this.db.compartment.count({
      where: { lockerId, status: 'available' },
    });

    if (availableCompartments === 0) {
      throw new Error('Aucun compartiment disponible à ce casier');
    }

    await this.db.parcel.update({
      where: { id: parcelId },
      data: { lockerId },
    });

    const updated = await this.db.parcel.findUniqueOrThrow({
      where: { id: parcelId },
      include: customerParcelInclude,
    });

    return updated;
  }

  private customerWhereClause(ctx: DataAccessContext) {
    const or: Array<{ customerId: string } | { recipientPhone: string }> = [
      { customerId: ctx.userId! },
    ];
    if (ctx.phone) {
      or.push({ recipientPhone: ctx.phone });
    }
    return { OR: or };
  }

  private async linkParcelsByPhone(ctx: DataAccessContext): Promise<void> {
    if (!ctx.phone || !ctx.userId) return;
    await this.linkParcelsForUser(ctx.userId, ctx.phone);
  }

  private async ensurePickupPin(parcelId: string): Promise<void> {
    const existing = await this.db.pickupPin.findUnique({ where: { parcelId } });
    if (existing) return;

    await this.db.pickupPin.create({
      data: {
        parcelId,
        code: generatePickupCode(),
      },
    });
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
