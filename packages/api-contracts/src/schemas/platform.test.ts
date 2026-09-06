import { describe, expect, it } from 'vitest';
import { updatePlatformSettingsSchema } from './platform.js';
import { updateDeliveryPricingSchema } from './pricing.js';

describe('updatePlatformSettingsSchema', () => {
  const base = {
    pickupFeeAmount: 5,
    pickupFeeCurrency: 'USD',
    requireOrgApproval: false,
    defaultEnabledFeatures: ['CREATE_SHIPMENT'] as const,
  };

  it('accepts numeric defaults', () => {
    expect(
      updatePlatformSettingsSchema.safeParse({
        ...base,
        defaultDailyShipments: 50,
        defaultMonthlyShipments: 1000,
        defaultMaxPackageValueUsd: 500,
        defaultCodDailyLimitUsd: 200,
      }).success,
    ).toBe(true);
  });

  it('accepts null defaults for unlimited caps', () => {
    expect(
      updatePlatformSettingsSchema.safeParse({
        ...base,
        defaultDailyShipments: null,
        defaultMonthlyShipments: null,
        defaultMaxPackageValueUsd: null,
        defaultCodDailyLimitUsd: null,
      }).success,
    ).toBe(true);
  });
});

describe('updateDeliveryPricingSchema', () => {
  it('accepts USD and CDF currencies', () => {
    const base = {
      distanceThresholdKm: 10,
      belowThresholdAmount: 5,
      aboveThresholdAmount: 8,
      smallCoefficient: 1,
      mediumCoefficient: 1.5,
      largeCoefficient: 2,
      dropOffFeeAmount: 1,
      lockerRentalRateAmount: 0.5,
    };
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'USD' }).success).toBe(true);
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'CDF' }).success).toBe(true);
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'EUR' }).success).toBe(false);
  });
});
