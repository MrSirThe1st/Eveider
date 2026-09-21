import {
  collectionAuthorizationErrorMessage,
  evaluateRecipientCollection,
  outboundChargeKind,
  parseDeliveryPricingCurrency,
  payerForChargeKind,
  resolveCommercialPricingModel,
  returnChargeKind,
  roundFeeAmount,
  ZONE_PRICING_NOT_CONFIGURED_MESSAGE,
  type ChargePayer,
  type DeliveryPricingCurrency,
  type ParcelChargeKind,
  type ParcelReturnMethod,
  type RecipientCollectionDecision,
  type RecipientServiceChargeKind,
  type ShipmentPickupType,
  type ZonePricingAmount,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import type { ParcelCharge } from '../db/types.js';
import { mapParcelCharge } from './parcel-charge.repository.js';
import { readPlatformCurrency } from './platform-settings.repository.js';
import { PricingRepository } from './pricing.repository.js';
import { buildPawaPayConfig, getPawaPayConfig } from '../payments/pawapay-config.js';

export type PricingZone = {
  id: string;
  code: string;
  name: string;
  status: string;
  cityStatus: string;
  outboundDeliveryAmount: ZonePricingAmount;
  returnDeliveryAmount: ZonePricingAmount;
};

export type CanonicalQuote = {
  kind: ParcelChargeKind;
  payer: ChargePayer;
  amount: number;
  currency: DeliveryPricingCurrency;
  pricingZoneId: string | null;
  zoneCode: string | null;
  zoneName: string | null;
};

export class CommercialRepository {
  constructor(private readonly db: Queryable) {}

  async resolveZoneForLocker(lockerId: string): Promise<PricingZone> {
    const result = await this.db.query(
      `SELECT sa.id, sa.code, sa.name, sa.status,
              c.status AS city_status,
              zp.outbound_delivery_amount, zp.return_delivery_amount
       FROM lockers l
       JOIN service_areas sa ON sa.id = l.service_area_id
       JOIN cities c ON c.id = sa.city_id
       LEFT JOIN zone_pricing zp ON zp.zone_id = sa.id
       WHERE l.id = $1
       LIMIT 1`,
      [lockerId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Zone tarifaire introuvable pour ce casier');
    }
    if (String(row.status) !== 'active') {
      throw new Error('Cette zone de service n’est plus active');
    }
    if (String(row.city_status) !== 'active') {
      throw new Error('Cette ville n’est plus active');
    }
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      status: String(row.status),
      cityStatus: String(row.city_status),
      outboundDeliveryAmount:
        row.outbound_delivery_amount == null ? null : Number(row.outbound_delivery_amount),
      returnDeliveryAmount:
        row.return_delivery_amount == null ? null : Number(row.return_delivery_amount),
    };
  }

  private requireConfiguredAmount(amount: ZonePricingAmount): number {
    if (amount == null) {
      throw new Error(ZONE_PRICING_NOT_CONFIGURED_MESSAGE);
    }
    return amount;
  }

  async quoteOutbound(input: {
    pickupType: ShipmentPickupType;
    lockerId: string;
  }): Promise<CanonicalQuote> {
    const kind = outboundChargeKind(input.pickupType);
    const currency = await this.currency();
    if (kind === 'locker_collection') {
      const rules = await new PricingRepository(this.db).getDeliveryRules();
      return {
        kind,
        payer: 'recipient',
        amount: roundFeeAmount(rules.lockerCollectionAmount, currency),
        currency,
        pricingZoneId: null,
        zoneCode: null,
        zoneName: null,
      };
    }

    const zone = await this.resolveZoneForLocker(input.lockerId);
    const amount = this.requireConfiguredAmount(zone.outboundDeliveryAmount);
    return {
      kind,
      payer: 'recipient',
      amount: roundFeeAmount(amount, currency),
      currency,
      pricingZoneId: zone.id,
      zoneCode: zone.code,
      zoneName: zone.name,
    };
  }

  async quoteReturn(input: {
    method: ParcelReturnMethod;
    returnLockerId: string;
  }): Promise<CanonicalQuote> {
    const kind = returnChargeKind(input.method);
    const currency = await this.currency();
    if (kind === 'return_locker') {
      const rules = await new PricingRepository(this.db).getDeliveryRules();
      return {
        kind,
        payer: 'business',
        amount: roundFeeAmount(rules.returnLockerAmount, currency),
        currency,
        pricingZoneId: null,
        zoneCode: null,
        zoneName: null,
      };
    }

    const zone = await this.resolveZoneForLocker(input.returnLockerId);
    const amount = this.requireConfiguredAmount(zone.returnDeliveryAmount);
    return {
      kind,
      payer: 'business',
      amount: roundFeeAmount(amount, currency),
      currency,
      pricingZoneId: zone.id,
      zoneCode: zone.code,
      zoneName: zone.name,
    };
  }

  async snapshotOutboundCharge(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      pickupType: ShipmentPickupType;
      lockerId: string;
    },
  ): Promise<ParcelCharge> {
    const quote = await this.quoteOutbound({
      pickupType: input.pickupType,
      lockerId: input.lockerId,
    });
    return this.snapshotCharge(db, {
      parcelId: input.parcelId,
      businessId: input.businessId,
      ...quote,
    });
  }

  async snapshotReturnCharge(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      method: ParcelReturnMethod;
      returnLockerId: string;
    },
  ): Promise<ParcelCharge> {
    const quote = await this.quoteReturn({
      method: input.method,
      returnLockerId: input.returnLockerId,
    });
    return this.snapshotCharge(db, {
      parcelId: input.parcelId,
      businessId: input.businessId,
      ...quote,
    });
  }

  async findRecipientServiceCharge(parcelId: string): Promise<ParcelCharge | null> {
    const result = await this.db.query(
      `SELECT * FROM parcel_charges
       WHERE parcel_id = $1
         AND kind = ANY($2)
         AND status <> 'void'
       ORDER BY created_at ASC
       LIMIT 1`,
      [parcelId, ['outbound_delivery', 'locker_collection']],
    );
    return result.rows[0] ? mapParcelCharge(result.rows[0]) : null;
  }

  async evaluateRecipientCollection(parcelId: string): Promise<RecipientCollectionDecision> {
    const parcelResult = await this.db.query(
      `SELECT status, pickup_type, commercial_model, payment_responsibility
       FROM parcels
       WHERE id = $1
       LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel) {
      return evaluateRecipientCollection({
        parcelStatus: 'created',
        model: 'legacy',
        recipientChargeAmount: null,
        paymentCompleted: false,
      });
    }

    const charge = await this.findRecipientServiceCharge(parcelId);
    const model = resolveCommercialPricingModel({
      commercialModel: parcel.commercial_model == null ? null : String(parcel.commercial_model),
      hasRecipientServiceCharge: Boolean(charge),
    });

    const paidResult = await this.db.query(
      `SELECT id FROM parcel_payments WHERE parcel_id = $1 AND status = 'completed' LIMIT 1`,
      [parcelId],
    );
    const paymentCompleted = Boolean(paidResult.rows[0]);

    if (model === 'canonical') {
      return evaluateRecipientCollection({
        parcelStatus: parcel.status,
        model: 'canonical',
        recipientChargeAmount: charge ? charge.amount : null,
        paymentCompleted,
      });
    }

    const legacyFeeRequired = await this.legacyRecipientFeeRequired(
      String(parcel.payment_responsibility ?? 'receiver_pays'),
    );
    return evaluateRecipientCollection({
      parcelStatus: parcel.status,
      model: 'legacy',
      recipientChargeAmount: null,
      paymentCompleted,
      legacyFeeRequired,
    });
  }

  async isRecipientCollectionCommerciallyAuthorized(parcelId: string): Promise<boolean> {
    const decision = await this.evaluateRecipientCollection(parcelId);
    return decision.authorized;
  }

  async assertRecipientCollectionAuthorized(parcelId: string): Promise<RecipientCollectionDecision> {
    const decision = await this.evaluateRecipientCollection(parcelId);
    if (!decision.authorized) {
      throw new Error(collectionAuthorizationErrorMessage(decision));
    }
    return decision;
  }

  private async legacyRecipientFeeRequired(paymentResponsibility: string): Promise<boolean> {
    if (paymentResponsibility !== 'receiver_pays') return false;
    const settingsResult = await this.db.query(
      `SELECT pickup_fee_amount, pickup_fee_currency, platform_currency
       FROM platform_settings
       ORDER BY updated_at DESC
       LIMIT 1`,
    );
    const row = settingsResult.rows[0];
    const config = row
      ? buildPawaPayConfig({
          amount: String(row.pickup_fee_amount),
          currency: parseDeliveryPricingCurrency(
            row.platform_currency ?? row.pickup_fee_currency,
          ),
        })
      : getPawaPayConfig();
    return Boolean(config) && Number(config?.pickupFeeAmount) > 0;
  }

  async snapshotCharge(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      kind: ParcelChargeKind;
      payer: ChargePayer;
      amount: number;
      currency: DeliveryPricingCurrency;
      pricingZoneId: string | null;
    },
  ): Promise<ParcelCharge> {
    const existing = await db.query(
      `SELECT * FROM parcel_charges
       WHERE parcel_id = $1 AND kind = $2 AND status <> 'void'
       LIMIT 1`,
      [input.parcelId, input.kind],
    );
    if (existing.rows[0]) return mapParcelCharge(existing.rows[0]);

    const payer = input.payer ?? payerForChargeKind(input.kind);
    try {
      const inserted = await db.query(
        `INSERT INTO parcel_charges (
           parcel_id, business_id, kind, status, payer, pricing_zone_id,
           amount, currency, locked_at
         ) VALUES ($1, $2, $3, 'owed', $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          input.parcelId,
          input.businessId,
          input.kind,
          payer,
          input.pricingZoneId,
          input.amount,
          input.currency,
        ],
      );
      return mapParcelCharge(inserted.rows[0]!);
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === '23505') {
        const raced = await db.query(
          `SELECT * FROM parcel_charges
           WHERE parcel_id = $1 AND kind = $2 AND status <> 'void'
           LIMIT 1`,
          [input.parcelId, input.kind],
        );
        if (raced.rows[0]) return mapParcelCharge(raced.rows[0]);
      }
      throw error;
    }
  }

  private async currency(): Promise<DeliveryPricingCurrency> {
    return readPlatformCurrency(this.db);
  }
}

export type { RecipientServiceChargeKind };
