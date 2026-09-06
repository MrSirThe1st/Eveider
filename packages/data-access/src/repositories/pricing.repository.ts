import {
  calculateDeliveryFee,
  type DeliveryPricingCurrency,
  type DeliveryPricingRules,
  type PackageSize,
} from '@eveider/domain';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import type { DeliveryPricingRuleRow } from '../db/types.js';

function parseCurrency(value: unknown): DeliveryPricingCurrency {
  return value === 'USD' ? 'USD' : 'CDF';
}

function mapPricingRow(row: Record<string, unknown>): DeliveryPricingRuleRow {
  return {
    id: String(row.id),
    distanceThresholdKm: Number(row.distance_threshold_km),
    belowThresholdAmount: Number(row.below_threshold_amount),
    aboveThresholdAmount: Number(row.above_threshold_amount),
    currency: parseCurrency(row.currency),
    smallCoefficient: Number(row.small_coefficient),
    mediumCoefficient: Number(row.medium_coefficient),
    largeCoefficient: Number(row.large_coefficient),
    dropOffFeeAmount: Number(row.drop_off_fee_amount ?? 500),
    lockerRentalRateAmount: Number(row.locker_rental_rate_amount ?? 200),
    updatedAt: new Date(String(row.updated_at)),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

export function toDeliveryPricingRules(row: DeliveryPricingRuleRow): DeliveryPricingRules {
  return {
    distanceThresholdKm: row.distanceThresholdKm,
    belowThresholdAmount: row.belowThresholdAmount,
    aboveThresholdAmount: row.aboveThresholdAmount,
    currency: row.currency,
    sizeCoefficients: {
      small: row.smallCoefficient,
      medium: row.mediumCoefficient,
      large: row.largeCoefficient,
    },
    dropOffFeeAmount: row.dropOffFeeAmount,
    lockerRentalRateAmount: row.lockerRentalRateAmount,
  };
}

export type UpdateDeliveryPricingInput = {
  distanceThresholdKm: number;
  belowThresholdAmount: number;
  aboveThresholdAmount: number;
  currency: DeliveryPricingCurrency;
  smallCoefficient: number;
  mediumCoefficient: number;
  largeCoefficient: number;
  dropOffFeeAmount: number;
  lockerRentalRateAmount: number;
};

export class PricingRepository {
  constructor(private readonly db: Queryable) {}

  async getDeliveryRules(): Promise<DeliveryPricingRuleRow> {
    const result = await this.db.query(
      `SELECT * FROM delivery_pricing_rules ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Règles tarifaires introuvables');
    }
    return mapPricingRow(row);
  }

  async updateDeliveryRules(
    ctx: DataAccessContext,
    input: UpdateDeliveryPricingInput,
  ): Promise<DeliveryPricingRuleRow> {
    assertAdmin(ctx);
    const current = await this.getDeliveryRules();
    const result = await this.db.query(
      `UPDATE delivery_pricing_rules
       SET distance_threshold_km = $1,
           below_threshold_amount = $2,
           above_threshold_amount = $3,
           currency = $4,
           small_coefficient = $5,
           medium_coefficient = $6,
           large_coefficient = $7,
           drop_off_fee_amount = $8,
           locker_rental_rate_amount = $9,
           updated_at = NOW(),
           updated_by = $10
       WHERE id = $11
       RETURNING *`,
      [
        input.distanceThresholdKm,
        input.belowThresholdAmount,
        input.aboveThresholdAmount,
        input.currency,
        input.smallCoefficient,
        input.mediumCoefficient,
        input.largeCoefficient,
        input.dropOffFeeAmount,
        input.lockerRentalRateAmount,
        ctx.userId ?? null,
        current.id,
      ],
    );
    return mapPricingRow(result.rows[0]!);
  }

  quoteDeliveryFee(
    distanceKm: number,
    size: PackageSize,
    rulesRow?: DeliveryPricingRuleRow,
  ): number {
    const rules = rulesRow ? toDeliveryPricingRules(rulesRow) : undefined;
    return calculateDeliveryFee(distanceKm, size, rules);
  }
}
