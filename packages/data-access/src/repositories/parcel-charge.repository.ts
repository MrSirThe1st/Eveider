import {
  calculateDeliveryFee,
  calculateLockerRentalAmount,
  calculateLockerRentalPeriods,
  type DeliveryPricingCurrency,
  type DeliveryPricingRules,
  type LockerType,
  type PackageSize,
  type ParcelChargeKind,
  type ParcelChargeStatus,
  usesCompartmentGrid,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import type { DeliveryPricingRuleRow, ParcelCharge } from '../db/types.js';
import { toDeliveryPricingRules } from './pricing.repository.js';

function parseCurrency(value: unknown): DeliveryPricingCurrency {
  return value === 'USD' ? 'USD' : 'CDF';
}

export function mapParcelCharge(row: Record<string, unknown>): ParcelCharge {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    businessId: String(row.business_id),
    kind: row.kind as ParcelChargeKind,
    status: row.status as ParcelChargeStatus,
    amount: Number(row.amount),
    currency: parseCurrency(row.currency),
    unitRate: row.unit_rate == null ? null : Number(row.unit_rate),
    quantity: row.quantity == null ? null : Number(row.quantity),
    periodStartedAt: row.period_started_at == null ? null : new Date(String(row.period_started_at)),
    periodEndedAt: row.period_ended_at == null ? null : new Date(String(row.period_ended_at)),
    lockedAt: new Date(String(row.locked_at)),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

async function findActiveCharge(
  db: Queryable,
  parcelId: string,
  kind: ParcelChargeKind,
): Promise<ParcelCharge | null> {
  const result = await db.query(
    `SELECT * FROM parcel_charges
     WHERE parcel_id = $1 AND kind = $2 AND status <> 'void'
     LIMIT 1`,
    [parcelId, kind],
  );
  return result.rows[0] ? mapParcelCharge(result.rows[0]) : null;
}

export class ParcelChargeRepository {
  constructor(private readonly db: Queryable) {}

  async listForParcel(parcelId: string): Promise<ParcelCharge[]> {
    const result = await this.db.query(
      `SELECT * FROM parcel_charges
       WHERE parcel_id = $1 AND status <> 'void'
       ORDER BY created_at ASC`,
      [parcelId],
    );
    return result.rows.map((row) => mapParcelCharge(row));
  }

  async recordDeliveryFee(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      amount: number;
      currency: DeliveryPricingCurrency;
    },
  ): Promise<ParcelCharge> {
    const existing = await findActiveCharge(db, input.parcelId, 'delivery_fee');
    if (existing) return existing;
    const result = await db.query(
      `INSERT INTO parcel_charges (
         parcel_id, business_id, kind, status, amount, currency, locked_at
       ) VALUES ($1, $2, 'delivery_fee', 'owed', $3, $4, NOW())
       RETURNING *`,
      [input.parcelId, input.businessId, input.amount, input.currency],
    );
    return mapParcelCharge(result.rows[0]!);
  }

  async recordDropOffFee(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      amount: number;
      currency: DeliveryPricingCurrency;
    },
  ): Promise<ParcelCharge> {
    const existing = await findActiveCharge(db, input.parcelId, 'drop_off_fee');
    if (existing) return existing;
    const result = await db.query(
      `INSERT INTO parcel_charges (
         parcel_id, business_id, kind, status, amount, currency, locked_at
       ) VALUES ($1, $2, 'drop_off_fee', 'owed', $3, $4, NOW())
       RETURNING *`,
      [input.parcelId, input.businessId, input.amount, input.currency],
    );
    return mapParcelCharge(result.rows[0]!);
  }

  /**
   * Locks the rental rate when the free window has elapsed (first time only),
   * then upserts periods/amount. Finalizes to `owed` when endAt is a terminal event.
   */
  async syncLockerRental(
    db: Queryable,
    input: {
      parcelId: string;
      businessId: string;
      readyForPickupAt: Date;
      endAt: Date;
      freeHoldHours: number;
      currentRateAmount: number;
      currency: DeliveryPricingCurrency;
      lockerType: LockerType | null;
      compartmentId: string | null;
      finalize: boolean;
    },
  ): Promise<ParcelCharge | null> {
    const rentable =
      Boolean(input.compartmentId) &&
      (input.lockerType == null || usesCompartmentGrid(input.lockerType));
    if (!rentable) return null;

    const periods = calculateLockerRentalPeriods({
      readyForPickupAt: input.readyForPickupAt,
      endAt: input.endAt,
      freeHoldHours: input.freeHoldHours,
    });

    const existing = await findActiveCharge(db, input.parcelId, 'locker_rental');

    if (periods <= 0 && !existing) return null;
    if (periods <= 0 && existing && !input.finalize) return existing;

    const unitRate = existing?.unitRate ?? input.currentRateAmount;
    const currency = existing?.currency ?? input.currency;
    const quantity = Math.max(periods, existing?.quantity ?? 0);
    const amount = calculateLockerRentalAmount({
      periods: quantity,
      rateAmount: unitRate,
      currency,
    });
    const periodStartedAt = new Date(
      input.readyForPickupAt.getTime() + input.freeHoldHours * 60 * 60 * 1000,
    );

    if (!existing) {
      if (periods <= 0) return null;
      const inserted = await db.query(
        `INSERT INTO parcel_charges (
           parcel_id, business_id, kind, status, amount, currency,
           unit_rate, quantity, period_started_at, period_ended_at, locked_at
         ) VALUES ($1, $2, 'locker_rental', $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING *`,
        [
          input.parcelId,
          input.businessId,
          input.finalize ? 'owed' : 'pending',
          amount,
          currency,
          unitRate,
          quantity,
          periodStartedAt,
          input.finalize ? input.endAt : null,
        ],
      );
      return mapParcelCharge(inserted.rows[0]!);
    }

    const nextStatus = input.finalize || existing.status === 'owed' ? 'owed' : 'pending';
    const updated = await db.query(
      `UPDATE parcel_charges
       SET status = $1,
           amount = $2,
           quantity = $3,
           period_ended_at = CASE WHEN $4 THEN $5 ELSE period_ended_at END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [nextStatus, amount, quantity, input.finalize, input.endAt, existing.id],
    );
    return mapParcelCharge(updated.rows[0]!);
  }
}

export function quoteForPickupType(input: {
  pickupType: 'courier_pickup' | 'merchant_dropoff';
  distanceKm: number;
  size: PackageSize;
  rules: DeliveryPricingRules | DeliveryPricingRuleRow;
}): {
  feeAmount: number;
  feeCurrency: DeliveryPricingCurrency;
  deliveryDistanceKm: number;
  pricingSizeUsed: PackageSize | null;
  chargeKind: 'delivery_fee' | 'drop_off_fee';
} {
  const rules: DeliveryPricingRules =
    'sizeCoefficients' in input.rules
      ? (input.rules as DeliveryPricingRules)
      : toDeliveryPricingRules(input.rules as DeliveryPricingRuleRow);

  if (input.pickupType === 'merchant_dropoff') {
    return {
      feeAmount: rules.dropOffFeeAmount,
      feeCurrency: rules.currency,
      deliveryDistanceKm: 0,
      pricingSizeUsed: null,
      chargeKind: 'drop_off_fee',
    };
  }

  return {
    feeAmount: calculateDeliveryFee(input.distanceKm, input.size, rules),
    feeCurrency: rules.currency,
    deliveryDistanceKm: Math.round(input.distanceKm * 100) / 100,
    pricingSizeUsed: input.size,
    chargeKind: 'delivery_fee',
  };
}
