import type { ParcelPayment, PaymentStatus, PrismaClient } from '@prisma/client';
import { AccessDeniedError, assertCustomerRole, type DataAccessContext } from '../context.js';
import {
  getPawaPayConfig,
  isDrcDepositProvider,
  normalizePawaPayPhone,
  type DrcDepositProvider,
} from './pawapay-config.js';
import {
  getPawaPayDepositStatus,
  initiatePawaPayDeposit,
  mapPawaPayDepositStatus,
  type PawaPayDepositCallback,
} from './pawapay-client.js';
import { phonesMatch } from '../tracking/guest-track.js';

export type PickupPaymentSummary = {
  required: boolean;
  status: PaymentStatus | 'none';
  amount: string | null;
  currency: string | null;
  provider: string | null;
  depositId: string | null;
  failureReason: string | null;
};

export type InitiatePickupPaymentInput = {
  provider: DrcDepositProvider;
  phoneNumber?: string;
};

export type InitiatePickupPaymentResult = {
  payment: ParcelPayment;
  pawapayStatus: string;
};

export class PaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  async getPickupPaymentSummary(parcelId: string): Promise<PickupPaymentSummary> {
    const config = getPawaPayConfig();
    const latest = await this.db.parcelPayment.findFirst({
      where: { parcelId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      required: Boolean(config),
      status: latest?.status ?? 'none',
      amount: config?.pickupFeeAmount ?? null,
      currency: config?.pickupFeeCurrency ?? null,
      provider: latest?.provider ?? null,
      depositId: latest?.depositId ?? null,
      failureReason: latest?.failureReason ?? null,
    };
  }

  async hasCompletedPickupPayment(parcelId: string): Promise<boolean> {
    const config = getPawaPayConfig();
    if (!config) return true;

    const completed = await this.db.parcelPayment.findFirst({
      where: { parcelId, status: 'completed' },
      select: { id: true },
    });
    return Boolean(completed);
  }

  async initiatePickupPayment(
    ctx: DataAccessContext,
    parcelId: string,
    input: InitiatePickupPaymentInput,
  ): Promise<InitiatePickupPaymentResult> {
    assertCustomerRole(ctx);

    const config = getPawaPayConfig();
    if (!config) {
      throw new Error('Paiement mobile indisponible pour le moment');
    }
    if (!isDrcDepositProvider(input.provider)) {
      throw new Error('Opérateur mobile invalide');
    }

    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: {
        id: true,
        status: true,
        customerId: true,
        recipientPhone: true,
      },
    });
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    this.assertCustomerParcelAccess(ctx, parcel.customerId, parcel.recipientPhone);

    if (parcel.status !== 'ready_for_pickup') {
      throw new Error('Le paiement n’est disponible que pour un colis prêt au retrait');
    }

    const existingCompleted = await this.db.parcelPayment.findFirst({
      where: { parcelId, status: 'completed' },
    });
    if (existingCompleted) {
      throw new Error('Ce colis a déjà été payé');
    }

    const inFlight = await this.db.parcelPayment.findFirst({
      where: { parcelId, status: { in: ['pending', 'processing'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (inFlight) {
      const synced = await this.syncPaymentStatus(inFlight);
      if (synced.status === 'completed') {
        throw new Error('Ce colis a déjà été payé');
      }
      if (synced.status === 'processing' || synced.status === 'pending') {
        return {
          payment: synced,
          pawapayStatus: synced.pawapayStatus ?? 'PROCESSING',
        };
      }
    }

    const phoneNumber = normalizePawaPayPhone(input.phoneNumber ?? ctx.phone ?? parcel.recipientPhone);
    if (phoneNumber.length < 8) {
      throw new Error('Numéro mobile money invalide');
    }

    const depositId = crypto.randomUUID();
    const payment = await this.db.parcelPayment.create({
      data: {
        parcelId,
        userId: ctx.userId,
        depositId,
        amount: config.pickupFeeAmount,
        currency: config.pickupFeeCurrency,
        provider: input.provider,
        phoneNumber,
        status: 'pending',
      },
    });

    const result = await initiatePawaPayDeposit({
      depositId,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      phoneNumber,
      provider: input.provider,
    });

    if (!result.ok) {
      await this.db.parcelPayment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          pawapayStatus: 'FAILED',
          failureReason: result.error,
        },
      });
      throw new Error(result.error);
    }

    const mappedStatus = mapPawaPayDepositStatus(result.status);
    const updated = await this.db.parcelPayment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus,
        pawapayStatus: result.status,
        completedAt: mappedStatus === 'completed' ? new Date() : null,
      },
    });

    if (mappedStatus === 'processing') {
      const synced = await this.syncPaymentStatus(updated);
      return {
        payment: synced,
        pawapayStatus: synced.pawapayStatus ?? result.status,
      };
    }

    return {
      payment: updated,
      pawapayStatus: result.status,
    };
  }

  async refreshPickupPayment(ctx: DataAccessContext, parcelId: string): Promise<PickupPaymentSummary> {
    assertCustomerRole(ctx);

    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: { customerId: true, recipientPhone: true },
    });
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    this.assertCustomerParcelAccess(ctx, parcel.customerId, parcel.recipientPhone);

    return this.refreshPickupPaymentForParcel(parcelId);
  }

  /** Guest track — verify phone matches parcel, no customer session. */
  async initiateGuestPickupPayment(
    parcelId: string,
    recipientPhone: string,
    input: InitiatePickupPaymentInput,
  ): Promise<InitiatePickupPaymentResult> {
    const config = getPawaPayConfig();
    if (!config) {
      throw new Error('Paiement mobile indisponible pour le moment');
    }
    if (!isDrcDepositProvider(input.provider)) {
      throw new Error('Opérateur mobile invalide');
    }

    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: {
        id: true,
        status: true,
        recipientPhone: true,
      },
    });
    if (!parcel || !phonesMatch(parcel.recipientPhone, recipientPhone)) {
      throw new Error('Colis introuvable');
    }

    if (parcel.status !== 'ready_for_pickup') {
      throw new Error('Le paiement n’est disponible que pour un colis prêt au retrait');
    }

    const existingCompleted = await this.db.parcelPayment.findFirst({
      where: { parcelId, status: 'completed' },
    });
    if (existingCompleted) {
      throw new Error('Ce colis a déjà été payé');
    }

    const inFlight = await this.db.parcelPayment.findFirst({
      where: { parcelId, status: { in: ['pending', 'processing'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (inFlight) {
      const synced = await this.syncPaymentStatus(inFlight);
      if (synced.status === 'completed') {
        throw new Error('Ce colis a déjà été payé');
      }
      if (synced.status === 'processing' || synced.status === 'pending') {
        return {
          payment: synced,
          pawapayStatus: synced.pawapayStatus ?? 'PROCESSING',
        };
      }
    }

    const phoneNumber = normalizePawaPayPhone(input.phoneNumber ?? parcel.recipientPhone);
    if (phoneNumber.length < 8) {
      throw new Error('Numéro mobile money invalide');
    }

    const depositId = crypto.randomUUID();
    const payment = await this.db.parcelPayment.create({
      data: {
        parcelId,
        userId: null,
        depositId,
        amount: config.pickupFeeAmount,
        currency: config.pickupFeeCurrency,
        provider: input.provider,
        phoneNumber,
        status: 'pending',
      },
    });

    const result = await initiatePawaPayDeposit({
      depositId,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      phoneNumber,
      provider: input.provider,
    });

    if (!result.ok) {
      await this.db.parcelPayment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          pawapayStatus: 'FAILED',
          failureReason: result.error,
        },
      });
      throw new Error(result.error);
    }

    const mappedStatus = mapPawaPayDepositStatus(result.status);
    const updated = await this.db.parcelPayment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus,
        pawapayStatus: result.status,
        completedAt: mappedStatus === 'completed' ? new Date() : null,
      },
    });

    if (mappedStatus === 'processing') {
      const synced = await this.syncPaymentStatus(updated);
      return {
        payment: synced,
        pawapayStatus: synced.pawapayStatus ?? result.status,
      };
    }

    return {
      payment: updated,
      pawapayStatus: result.status,
    };
  }

  async refreshGuestPickupPayment(
    parcelId: string,
    recipientPhone: string,
  ): Promise<PickupPaymentSummary> {
    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: { recipientPhone: true },
    });
    if (!parcel || !phonesMatch(parcel.recipientPhone, recipientPhone)) {
      throw new Error('Colis introuvable');
    }
    return this.refreshPickupPaymentForParcel(parcelId);
  }

  private async refreshPickupPaymentForParcel(parcelId: string): Promise<PickupPaymentSummary> {
    const latest = await this.db.parcelPayment.findFirst({
      where: { parcelId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && (latest.status === 'pending' || latest.status === 'processing')) {
      await this.syncPaymentStatus(latest);
    }

    return this.getPickupPaymentSummary(parcelId);
  }

  async applyDepositCallback(callback: PawaPayDepositCallback): Promise<ParcelPayment | null> {
    const payment = await this.db.parcelPayment.findUnique({
      where: { depositId: callback.depositId },
    });
    if (!payment) return null;

    const mappedStatus = mapPawaPayDepositStatus(callback.status);
    return this.db.parcelPayment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus,
        pawapayStatus: callback.status,
        failureReason: mappedStatus === 'failed' ? callback.failureReason ?? 'Paiement refusé' : null,
        completedAt: mappedStatus === 'completed' ? new Date() : payment.completedAt,
      },
    });
  }

  private async syncPaymentStatus(payment: ParcelPayment): Promise<ParcelPayment> {
    const remote = await getPawaPayDepositStatus(payment.depositId);
    if (!remote.ok) {
      return payment;
    }

    const mappedStatus = mapPawaPayDepositStatus(remote.status);
    return this.db.parcelPayment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus,
        pawapayStatus: remote.status,
        failureReason: mappedStatus === 'failed' ? remote.failureReason ?? 'Paiement refusé' : null,
        completedAt: mappedStatus === 'completed' ? new Date() : payment.completedAt,
      },
    });
  }

  private assertCustomerParcelAccess(
    ctx: DataAccessContext,
    customerId: string | null,
    recipientPhone: string,
  ) {
    const ownsById = customerId && customerId === ctx.userId;
    const ownsByPhone = ctx.phone && recipientPhone === ctx.phone;
    if (!ownsById && !ownsByPhone) {
      throw new AccessDeniedError('Colis hors périmètre');
    }
  }
}
