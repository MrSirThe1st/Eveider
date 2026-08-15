import {
  calculateDeliveryFeeFc,
  type DeliveryPricingRules,
  type PackageSize,
} from '@eveider/domain';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import type { DeliveryPricingRuleRow } from '../db/types.js';

function mapPricingRow(row: Record<string, unknown>): DeliveryPricingRuleRow {
  return {
    id: String(row.id),
    distanceThresholdKm: Number(row.distance_threshold_km),
    belowThresholdAmountFc: Number(row.below_threshold_amount_fc),
    aboveThresholdAmountFc: Number(row.above_threshold_amount_fc),
    smallCoefficient: Number(row.small_coefficient),
    mediumCoefficient: Number(row.medium_coefficient),
    largeCoefficient: Number(row.large_coefficient),
    updatedAt: new Date(String(row.updated_at)),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

export function toDeliveryPricingRules(row: DeliveryPricingRuleRow): DeliveryPricingRules {
  return {
    distanceThresholdKm: row.distanceThresholdKm,
    belowThresholdAmountFc: row.belowThresholdAmountFc,
    aboveThresholdAmountFc: row.aboveThresholdAmountFc,
    sizeCoefficients: {
      small: row.smallCoefficient,
      medium: row.mediumCoefficient,
      large: row.largeCoefficient,
    },
  };
}

export type UpdateDeliveryPricingInput = {
  distanceThresholdKm: number;
  belowThresholdAmountFc: number;
  aboveThresholdAmountFc: number;
  smallCoefficient: number;
  mediumCoefficient: number;
  largeCoefficient: number;
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
           below_threshold_amount_fc = $2,
           above_threshold_amount_fc = $3,
           small_coefficient = $4,
           medium_coefficient = $5,
           large_coefficient = $6,
           updated_at = NOW(),
           updated_by = $7
       WHERE id = $8
       RETURNING *`,
      [
        input.distanceThresholdKm,
        input.belowThresholdAmountFc,
        input.aboveThresholdAmountFc,
        input.smallCoefficient,
        input.mediumCoefficient,
        input.largeCoefficient,
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
    return calculateDeliveryFeeFc(distanceKm, size, rules);
  }
}
