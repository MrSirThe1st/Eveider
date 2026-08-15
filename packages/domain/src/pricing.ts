import type { PackageSize } from './shipment.js';

export type DeliveryPricingRules = {
  distanceThresholdKm: number;
  belowThresholdAmountFc: number;
  aboveThresholdAmountFc: number;
  sizeCoefficients: Record<PackageSize, number>;
};

export const DEFAULT_DELIVERY_PRICING_RULES: DeliveryPricingRules = {
  distanceThresholdKm: 10,
  belowThresholdAmountFc: 1500,
  aboveThresholdAmountFc: 3000,
  sizeCoefficients: {
    small: 1,
    medium: 1.5,
    large: 2,
  },
};

export function sizeCoefficientFor(
  size: PackageSize,
  rules: DeliveryPricingRules = DEFAULT_DELIVERY_PRICING_RULES,
): number {
  return rules.sizeCoefficients[size];
}

/** FC delivery fee: base tier × size coefficient. Pickup fee remains separate. */
export function calculateDeliveryFeeFc(
  distanceKm: number,
  size: PackageSize,
  rules: DeliveryPricingRules = DEFAULT_DELIVERY_PRICING_RULES,
): number {
  const base =
    distanceKm > rules.distanceThresholdKm
      ? rules.aboveThresholdAmountFc
      : rules.belowThresholdAmountFc;
  return Math.round(base * sizeCoefficientFor(size, rules));
}

export function formatDeliveryFeeFc(amountFc: number): string {
  return `${amountFc.toLocaleString('fr-CD')} FC`;
}
