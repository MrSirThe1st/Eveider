import type { PackageSize } from './shipment.js';

export type DeliveryPricingCurrency = 'USD' | 'CDF';

export type DeliveryPricingRules = {
  distanceThresholdKm: number;
  belowThresholdAmount: number;
  aboveThresholdAmount: number;
  currency: DeliveryPricingCurrency;
  sizeCoefficients: Record<PackageSize, number>;
  /** Fixed fee when business deposits at an Eveider point (no distance/size). */
  dropOffFeeAmount: number;
  /** Per 24h period after the free hold window (physical compartments only). */
  lockerRentalRateAmount: number;
};

export const DEFAULT_DELIVERY_PRICING_RULES: DeliveryPricingRules = {
  distanceThresholdKm: 10,
  belowThresholdAmount: 1500,
  aboveThresholdAmount: 3000,
  currency: 'CDF',
  sizeCoefficients: {
    small: 1,
    medium: 1.5,
    large: 2,
  },
  dropOffFeeAmount: 500,
  lockerRentalRateAmount: 200,
};

export type ParcelChargeKind = 'delivery_fee' | 'drop_off_fee' | 'locker_rental';
export type ParcelChargeStatus = 'pending' | 'owed' | 'void';

export const PARCEL_CHARGE_KINDS: readonly ParcelChargeKind[] = [
  'delivery_fee',
  'drop_off_fee',
  'locker_rental',
] as const;

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_RENTAL_PERIOD = 24 * MS_PER_HOUR;

export function sizeCoefficientFor(
  size: PackageSize,
  rules: DeliveryPricingRules = DEFAULT_DELIVERY_PRICING_RULES,
): number {
  return rules.sizeCoefficients[size];
}

function roundFeeAmount(raw: number, currency: DeliveryPricingCurrency): number {
  if (currency === 'USD') {
    return Math.round(raw * 100) / 100;
  }
  return Math.round(raw);
}

/** Delivery fee: base tier × size coefficient. Pickup fee remains separate. */
export function calculateDeliveryFee(
  distanceKm: number,
  size: PackageSize,
  rules: DeliveryPricingRules = DEFAULT_DELIVERY_PRICING_RULES,
): number {
  const base =
    distanceKm > rules.distanceThresholdKm
      ? rules.aboveThresholdAmount
      : rules.belowThresholdAmount;
  return roundFeeAmount(base * sizeCoefficientFor(size, rules), rules.currency);
}

/**
 * Billable 24h rental periods after the free hold window.
 * At or before freeHours from readyAt → 0. First period starts only after freeHours elapsed.
 */
export function calculateLockerRentalPeriods(input: {
  readyForPickupAt: Date;
  endAt: Date;
  freeHoldHours: number;
}): number {
  const freeMs = Math.max(0, input.freeHoldHours) * MS_PER_HOUR;
  const elapsed = input.endAt.getTime() - input.readyForPickupAt.getTime();
  if (elapsed <= freeMs) return 0;
  const billableMs = elapsed - freeMs;
  return Math.ceil(billableMs / MS_PER_RENTAL_PERIOD);
}

export function calculateLockerRentalAmount(input: {
  periods: number;
  rateAmount: number;
  currency: DeliveryPricingCurrency;
}): number {
  if (input.periods <= 0 || input.rateAmount <= 0) return 0;
  return roundFeeAmount(input.periods * input.rateAmount, input.currency);
}

export function formatDeliveryFee(
  amount: number,
  currency: DeliveryPricingCurrency = 'CDF',
): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return `${amount.toLocaleString('fr-CD')} CDF`;
}

/** @deprecated Use calculateDeliveryFee */
export const calculateDeliveryFeeFc = calculateDeliveryFee;

/** @deprecated Use formatDeliveryFee */
export function formatDeliveryFeeFc(amountFc: number): string {
  return formatDeliveryFee(amountFc, 'CDF');
}
