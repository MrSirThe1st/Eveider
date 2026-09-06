import { describe, expect, it } from 'vitest';
import {
  calculateDeliveryFee,
  calculateLockerRentalAmount,
  calculateLockerRentalPeriods,
  DEFAULT_DELIVERY_PRICING_RULES,
  formatDeliveryFee,
} from './pricing.js';
import { suggestPackageSizeFromDimensions } from './shipment.js';

describe('calculateDeliveryFee', () => {
  it('applies below-threshold base for short distances', () => {
    expect(calculateDeliveryFee(5, 'small')).toBe(1500);
    expect(calculateDeliveryFee(10, 'small')).toBe(1500);
  });

  it('applies above-threshold base beyond 10 km', () => {
    expect(calculateDeliveryFee(10.1, 'small')).toBe(3000);
    expect(calculateDeliveryFee(25, 'small')).toBe(3000);
  });

  it('multiplies by size coefficient', () => {
    expect(calculateDeliveryFee(5, 'medium')).toBe(2250);
    expect(calculateDeliveryFee(5, 'large')).toBe(3000);
    expect(calculateDeliveryFee(15, 'large')).toBe(6000);
  });

  it('respects custom pricing rules', () => {
    const rules = {
      ...DEFAULT_DELIVERY_PRICING_RULES,
      belowThresholdAmount: 2000,
      sizeCoefficients: { small: 1, medium: 2, large: 3 },
    };
    expect(calculateDeliveryFee(3, 'medium', rules)).toBe(4000);
  });

  it('rounds USD to cents', () => {
    const rules = {
      ...DEFAULT_DELIVERY_PRICING_RULES,
      currency: 'USD' as const,
      belowThresholdAmount: 2.5,
      sizeCoefficients: { small: 1, medium: 1.33, large: 2 },
    };
    expect(calculateDeliveryFee(3, 'medium', rules)).toBe(3.33);
  });
});

describe('formatDeliveryFee', () => {
  it('formats CDF', () => {
    expect(formatDeliveryFee(1500, 'CDF')).toContain('CDF');
  });

  it('formats USD', () => {
    expect(formatDeliveryFee(2.5, 'USD')).toMatch(/\$/);
  });
});

describe('calculateLockerRentalPeriods', () => {
  const ready = new Date('2026-09-01T10:00:00.000Z');

  it('charges nothing at or before the free window boundary', () => {
    expect(
      calculateLockerRentalPeriods({
        readyForPickupAt: ready,
        endAt: new Date(ready.getTime() + 72 * 60 * 60 * 1000),
        freeHoldHours: 72,
      }),
    ).toBe(0);
  });

  it('starts the first 24h period only after free hours elapse', () => {
    expect(
      calculateLockerRentalPeriods({
        readyForPickupAt: ready,
        endAt: new Date(ready.getTime() + 72 * 60 * 60 * 1000 + 1),
        freeHoldHours: 72,
      }),
    ).toBe(1);
  });

  it('counts full additional 24h periods with ceil', () => {
    expect(
      calculateLockerRentalPeriods({
        readyForPickupAt: ready,
        endAt: new Date(ready.getTime() + (72 + 24) * 60 * 60 * 1000),
        freeHoldHours: 72,
      }),
    ).toBe(1);
    expect(
      calculateLockerRentalPeriods({
        readyForPickupAt: ready,
        endAt: new Date(ready.getTime() + (72 + 24) * 60 * 60 * 1000 + 1),
        freeHoldHours: 72,
      }),
    ).toBe(2);
  });
});

describe('calculateLockerRentalAmount', () => {
  it('multiplies periods by the locked rate', () => {
    expect(
      calculateLockerRentalAmount({ periods: 2, rateAmount: 200, currency: 'CDF' }),
    ).toBe(400);
  });
});

describe('suggestPackageSizeFromDimensions', () => {
  it('returns null when no valid dimensions', () => {
    expect(suggestPackageSizeFromDimensions({})).toBeNull();
    expect(suggestPackageSizeFromDimensions({ lengthCm: 0 })).toBeNull();
  });

  it('suggests small for compact packages', () => {
    expect(
      suggestPackageSizeFromDimensions({ lengthCm: 30, widthCm: 20, heightCm: 10 }),
    ).toBe('small');
  });

  it('suggests medium for mid-size packages', () => {
    expect(
      suggestPackageSizeFromDimensions({ lengthCm: 45, widthCm: 35, heightCm: 20 }),
    ).toBe('medium');
  });

  it('suggests large for oversized packages', () => {
    expect(
      suggestPackageSizeFromDimensions({ lengthCm: 70, widthCm: 50, heightCm: 40 }),
    ).toBe('large');
  });
});
