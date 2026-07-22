import { AccessDeniedError, assertCustomerRole, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapParcelPayment } from '../db/mappers.js';
import type { ParcelPayment, PaymentStatus } from '../db/types.js';
import { phonesMatch } from '../tracking/guest-track.js';
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
  constructor(private readonly db: Queryable) {}

  async getPickupPaymentSummary(parcelId: string): Promise<PickupPaymentSummary> {
    const config = getPawaPayConfig();
    const latestResult = await this.db.query(
      `SELECT * FROM parcel_payments WHERE parcel_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [parcelId],
    );
    const latest = latestResult.rows[0] ? mapParcelPayment(latestResult.rows[0]) : null;

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

    const completed = await this.db.query(
      `SELECT id FROM parcel_payments WHERE parcel_id = $1 AND status = 'completed' LIMIT 1`,
      [parcelId],
    );
    return Boolean(completed.rows[0]);
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

    const parcelResult = await this.db.query(
      `SELECT id, status, customer_id, recipient_phone FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    this.assertCustomerParcelAccess(
      ctx,
      parcel.customer_id == null ? null : String(parcel.customer_id),
      String(parcel.recipient_phone),
    );

    if (parcel.status !== 'ready_for_pickup') {
      throw new Error('Le paiement n’est disponible que pour un colis prêt au retrait');
    }

    const existingCompleted = await this.db.query(
      `SELECT id FROM parcel_payments WHERE parcel_id = $1 AND status = 'completed' LIMIT 1`,
      [parcelId],
    );
    if (existingCompleted.rows[0]) {
      throw new Error('Ce colis a déjà été payé');
    }

    const inFlightResult = await this.db.query(
      `SELECT * FROM parcel_payments
       WHERE parcel_id = $1 AND status = ANY($2)
       ORDER BY created_at DESC LIMIT 1`,
      [parcelId, ['pending', 'processing']],
    );
    if (inFlightResult.rows[0]) {
      const synced = await this.syncPaymentStatus(mapParcelPayment(inFlightResult.rows[0]));
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

    const phoneNumber = normalizePawaPayPhone(
      input.phoneNumber ?? ctx.phone ?? String(parcel.recipient_phone),
    );
    if (phoneNumber.length < 8) {
      throw new Error('Numéro mobile money invalide');
    }

    const depositId = crypto.randomUUID();
    const paymentResult = await this.db.query(
      `INSERT INTO parcel_payments (
         parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        parcelId,
        ctx.userId ?? null,
        depositId,
        config.pickupFeeAmount,
        config.pickupFeeCurrency,
        input.provider,
        phoneNumber,
      ],
    );
    const payment = mapParcelPayment(paymentResult.rows[0]!);

    const result = await initiatePawaPayDeposit({
      depositId,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      phoneNumber,
      provider: input.provider,
    });

    if (!result.ok) {
      await this.db.query(
        `UPDATE parcel_payments
         SET status = 'failed', pawapay_status = 'FAILED', failure_reason = $1, updated_at = NOW()
         WHERE id = $2`,
        [result.error, payment.id],
      );
      throw new Error(result.error);
    }

    const mappedStatus = mapPawaPayDepositStatus(result.status);
    const updatedResult = await this.db.query(
      `UPDATE parcel_payments
       SET status = $1, pawapay_status = $2,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [mappedStatus, result.status, payment.id],
    );
    const updated = mapParcelPayment(updatedResult.rows[0]!);

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

    const parcelResult = await this.db.query(
      `SELECT customer_id, recipient_phone FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    this.assertCustomerParcelAccess(
      ctx,
      parcel.customer_id == null ? null : String(parcel.customer_id),
      String(parcel.recipient_phone),
    );

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

    const parcelResult = await this.db.query(
      `SELECT id, status, recipient_phone FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel || !phonesMatch(String(parcel.recipient_phone), recipientPhone)) {
      throw new Error('Colis introuvable');
    }

    if (parcel.status !== 'ready_for_pickup') {
      throw new Error('Le paiement n’est disponible que pour un colis prêt au retrait');
    }

    const existingCompleted = await this.db.query(
      `SELECT id FROM parcel_payments WHERE parcel_id = $1 AND status = 'completed' LIMIT 1`,
      [parcelId],
    );
    if (existingCompleted.rows[0]) {
      throw new Error('Ce colis a déjà été payé');
    }

    const inFlightResult = await this.db.query(
      `SELECT * FROM parcel_payments
       WHERE parcel_id = $1 AND status = ANY($2)
       ORDER BY created_at DESC LIMIT 1`,
      [parcelId, ['pending', 'processing']],
    );
    if (inFlightResult.rows[0]) {
      const synced = await this.syncPaymentStatus(mapParcelPayment(inFlightResult.rows[0]));
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

    const phoneNumber = normalizePawaPayPhone(input.phoneNumber ?? String(parcel.recipient_phone));
    if (phoneNumber.length < 8) {
      throw new Error('Numéro mobile money invalide');
    }

    const depositId = crypto.randomUUID();
    const paymentResult = await this.db.query(
      `INSERT INTO parcel_payments (
         parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status
       ) VALUES ($1, NULL, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        parcelId,
        depositId,
        config.pickupFeeAmount,
        config.pickupFeeCurrency,
        input.provider,
        phoneNumber,
      ],
    );
    const payment = mapParcelPayment(paymentResult.rows[0]!);

    const result = await initiatePawaPayDeposit({
      depositId,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      phoneNumber,
      provider: input.provider,
    });

    if (!result.ok) {
      await this.db.query(
        `UPDATE parcel_payments
         SET status = 'failed', pawapay_status = 'FAILED', failure_reason = $1, updated_at = NOW()
         WHERE id = $2`,
        [result.error, payment.id],
      );
      throw new Error(result.error);
    }

    const mappedStatus = mapPawaPayDepositStatus(result.status);
    const updatedResult = await this.db.query(
      `UPDATE parcel_payments
       SET status = $1, pawapay_status = $2,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [mappedStatus, result.status, payment.id],
    );
    const updated = mapParcelPayment(updatedResult.rows[0]!);

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
    const parcelResult = await this.db.query(
      `SELECT recipient_phone FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel || !phonesMatch(String(parcel.recipient_phone), recipientPhone)) {
      throw new Error('Colis introuvable');
    }
    return this.refreshPickupPaymentForParcel(parcelId);
  }

  private async refreshPickupPaymentForParcel(parcelId: string): Promise<PickupPaymentSummary> {
    const latestResult = await this.db.query(
      `SELECT * FROM parcel_payments WHERE parcel_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [parcelId],
    );
    if (latestResult.rows[0]) {
      const latest = mapParcelPayment(latestResult.rows[0]);
      if (latest.status === 'pending' || latest.status === 'processing') {
        await this.syncPaymentStatus(latest);
      }
    }

    return this.getPickupPaymentSummary(parcelId);
  }

  async applyDepositCallback(callback: PawaPayDepositCallback): Promise<ParcelPayment | null> {
    const paymentResult = await this.db.query(
      `SELECT * FROM parcel_payments WHERE deposit_id = $1 LIMIT 1`,
      [callback.depositId],
    );
    const paymentRow = paymentResult.rows[0];
    if (!paymentRow) return null;
    const payment = mapParcelPayment(paymentRow);

    const mappedStatus = mapPawaPayDepositStatus(callback.status);
    const updated = await this.db.query(
      `UPDATE parcel_payments
       SET status = $1,
           pawapay_status = $2,
           failure_reason = $3,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        mappedStatus,
        callback.status,
        mappedStatus === 'failed' ? (callback.failureReason ?? 'Paiement refusé') : null,
        payment.id,
      ],
    );
    return mapParcelPayment(updated.rows[0]!);
  }

  private async syncPaymentStatus(payment: ParcelPayment): Promise<ParcelPayment> {
    const remote = await getPawaPayDepositStatus(payment.depositId);
    if (!remote.ok) {
      return payment;
    }

    const mappedStatus = mapPawaPayDepositStatus(remote.status);
    const updated = await this.db.query(
      `UPDATE parcel_payments
       SET status = $1,
           pawapay_status = $2,
           failure_reason = $3,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        mappedStatus,
        remote.status,
        mappedStatus === 'failed' ? (remote.failureReason ?? 'Paiement refusé') : null,
        payment.id,
      ],
    );
    return mapParcelPayment(updated.rows[0]!);
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
