import { AccessDeniedError, assertCustomerRole, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapParcelPayment } from '../db/mappers.js';
import type { ParcelPayment, PaymentStatus } from '../db/types.js';
import { phonesMatch } from '../tracking/guest-track.js';
import { CommercialRepository } from '../repositories/commercial.repository.js';
import { CollectionCredentialRepository } from '../repositories/collection-credential.repository.js';
import {
  PARCEL_CHARGE_KIND_LABELS,
  parseDeliveryPricingCurrency,
  type ParcelChargeKind,
} from '@eveider/domain';
import {
  buildPawaPayConfig,
  getPawaPayConfig,
  isDrcDepositProvider,
  normalizePawaPayPhone,
  type DrcDepositProvider,
  type PawaPayConfig,
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
  kind: ParcelChargeKind | 'pickup_fee' | null;
  purpose: string | null;
  integrityError: 'CANONICAL_CHARGE_MISSING' | null;
  paymentProviderAvailable: boolean;
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

  private async resolvePawaPayConfig(fee?: { amount: string; currency: string }) {
    if (fee) return buildPawaPayConfig(fee);
    const settingsResult = await this.db.query(
      `SELECT pickup_fee_amount, pickup_fee_currency, platform_currency
       FROM platform_settings
       ORDER BY updated_at DESC
       LIMIT 1`,
    );
    const row = settingsResult.rows[0];
    if (!row) return getPawaPayConfig();
    return buildPawaPayConfig({
      amount: String(row.pickup_fee_amount),
      currency: parseDeliveryPricingCurrency(
        row.platform_currency ?? row.pickup_fee_currency,
      ),
    });
  }

  private formatChargeAmount(amount: number, currency: string): string {
    if (currency === 'USD') return amount.toFixed(2);
    return String(Math.round(amount));
  }

  private async resolveRecipientTariff(parcelId: string): Promise<{
    required: boolean;
    amount: string | null;
    currency: string | null;
    kind: ParcelChargeKind | 'pickup_fee' | null;
    purpose: string | null;
    config: PawaPayConfig | null;
    integrityError: 'CANONICAL_CHARGE_MISSING' | null;
    paymentProviderAvailable: boolean;
  }> {
    const commercial = new CommercialRepository(this.db);
    const decision = await commercial.evaluateRecipientCollection(parcelId);
    const charge = await commercial.findRecipientServiceCharge(parcelId);

    if (decision.model === 'canonical') {
      const amount =
        charge && charge.amount > 0
          ? this.formatChargeAmount(charge.amount, charge.currency)
          : null;
      const config =
        charge && amount
          ? buildPawaPayConfig({ amount, currency: charge.currency })
          : null;
      return {
        required: decision.outstanding,
        amount: charge && charge.amount > 0 ? amount : null,
        currency: charge && charge.amount > 0 ? charge.currency : null,
        kind: charge?.kind ?? null,
        purpose: charge ? PARCEL_CHARGE_KIND_LABELS[charge.kind] : null,
        config,
        integrityError:
          decision.code === 'CANONICAL_CHARGE_MISSING' ? 'CANONICAL_CHARGE_MISSING' : null,
        paymentProviderAvailable: Boolean(config),
      };
    }

    const parcelResult = await this.db.query(
      `SELECT payment_responsibility FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const paymentResponsibility = String(
      parcelResult.rows[0]?.payment_responsibility ?? 'receiver_pays',
    );
    const config = await this.resolvePawaPayConfig();
    const customerPays = Boolean(config) && paymentResponsibility === 'receiver_pays';
    return {
      required: customerPays && decision.outstanding,
      amount: customerPays ? (config?.pickupFeeAmount ?? null) : null,
      currency: customerPays ? (config?.pickupFeeCurrency ?? null) : null,
      kind: customerPays ? 'pickup_fee' : null,
      purpose: customerPays ? 'Frais de retrait' : null,
      config,
      integrityError: null,
      paymentProviderAvailable: Boolean(config),
    };
  }

  async getPickupPaymentSummary(parcelId: string): Promise<PickupPaymentSummary> {
    const tariff = await this.resolveRecipientTariff(parcelId);

    const latestResult = await this.db.query(
      `SELECT * FROM parcel_payments WHERE parcel_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [parcelId],
    );
    const latest = latestResult.rows[0] ? mapParcelPayment(latestResult.rows[0]) : null;
    const paid = latest?.status === 'completed';
    const required = tariff.required && !paid;

    return {
      required,
      status: latest?.status ?? 'none',
      amount: tariff.amount,
      currency: tariff.currency,
      provider: latest?.provider ?? null,
      depositId: latest?.depositId ?? null,
      failureReason: latest?.failureReason ?? null,
      kind: tariff.kind,
      purpose: required || tariff.amount ? tariff.purpose : null,
      integrityError: tariff.integrityError,
      paymentProviderAvailable: tariff.paymentProviderAvailable,
    };
  }

  async hasCompletedPickupPayment(parcelId: string): Promise<boolean> {
    const commercial = new CommercialRepository(this.db);
    const decision = await commercial.evaluateRecipientCollection(parcelId);
    return !decision.outstanding;
  }

  async initiatePickupPayment(
    ctx: DataAccessContext,
    parcelId: string,
    input: InitiatePickupPaymentInput,
  ): Promise<InitiatePickupPaymentResult> {
    assertCustomerRole(ctx);

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

    const tariff = await this.resolveRecipientTariff(parcelId);
    if (!tariff.config) {
      throw new Error('Paiement mobile indisponible pour le moment');
    }
    if (!tariff.required || !tariff.amount || !tariff.currency) {
      throw new Error('Aucun frais destinataire à régler');
    }
    const config = tariff.config;

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
           completed_at = CASE WHEN $4 THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [mappedStatus, result.status, payment.id, mappedStatus === 'completed'],
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

    const tariff = await this.resolveRecipientTariff(parcelId);
    if (!tariff.config) {
      throw new Error('Paiement mobile indisponible pour le moment');
    }
    if (!tariff.required || !tariff.amount || !tariff.currency) {
      throw new Error('Aucun frais destinataire à régler');
    }
    const config = tariff.config;

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
           completed_at = CASE WHEN $4 THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [mappedStatus, result.status, payment.id, mappedStatus === 'completed'],
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
           completed_at = CASE WHEN $5 THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        mappedStatus,
        callback.status,
        mappedStatus === 'failed' ? (callback.failureReason ?? 'Paiement refusé') : null,
        payment.id,
        mappedStatus === 'completed',
      ],
    );
    const mapped = mapParcelPayment(updated.rows[0]!);
    await this.reconcileCollectionCredentialIfPaid(mapped);
    return mapped;
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
           completed_at = CASE WHEN $5 THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        mappedStatus,
        remote.status,
        mappedStatus === 'failed' ? (remote.failureReason ?? 'Paiement refusé') : null,
        payment.id,
        mappedStatus === 'completed',
      ],
    );
    const mapped = mapParcelPayment(updated.rows[0]!);
    await this.reconcileCollectionCredentialIfPaid(mapped);
    return mapped;
  }

  private async reconcileCollectionCredentialIfPaid(payment: ParcelPayment): Promise<void> {
    if (payment.status !== 'completed') return;
    await new CollectionCredentialRepository(this.db).reconcileForParcel(payment.parcelId);
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
