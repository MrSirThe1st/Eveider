import { describe, expect, it } from 'vitest';
import { calculateDeliveryFeeFc, DEFAULT_DELIVERY_PRICING_RULES } from './pricing.js';
import { suggestPackageSizeFromDimensions } from './shipment.js';

describe('calculateDeliveryFeeFc', () => {
  it('applies below-threshold base for short distances', () => {
    expect(calculateDeliveryFeeFc(5, 'small')).toBe(1500);
    expect(calculateDeliveryFeeFc(10, 'small')).toBe(1500);
  });

  it('applies above-threshold base beyond 10 km', () => {
    expect(calculateDeliveryFeeFc(10.1, 'small')).toBe(3000);
    expect(calculateDeliveryFeeFc(25, 'small')).toBe(3000);
  });

  it('multiplies by size coefficient', () => {
    expect(calculateDeliveryFeeFc(5, 'medium')).toBe(2250);
    expect(calculateDeliveryFeeFc(5, 'large')).toBe(3000);
    expect(calculateDeliveryFeeFc(15, 'large')).toBe(6000);
  });

  it('respects custom pricing rules', () => {
    const rules = {
      ...DEFAULT_DELIVERY_PRICING_RULES,
      belowThresholdAmountFc: 2000,
      sizeCoefficients: { small: 1, medium: 2, large: 3 },
    };
    expect(calculateDeliveryFeeFc(3, 'medium', rules)).toBe(4000);
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
