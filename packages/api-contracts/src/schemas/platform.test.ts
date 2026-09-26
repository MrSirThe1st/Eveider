import { describe, expect, it } from 'vitest';
import { updatePlatformSettingsSchema } from './platform.js';
import { updateDeliveryPricingSchema } from './pricing.js';

describe('updatePlatformSettingsSchema', () => {
  const base = {
    pickupFeeAmount: 5,
    platformCurrency: 'USD' as const,
    requireOrgApproval: false,
    defaultEnabledFeatures: ['CREATE_SHIPMENT'] as const,
    driverSelfAssignmentEnabled: false,
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

  it('normalizes pickupFeeCurrency onto platformCurrency', () => {
    const parsed = updatePlatformSettingsSchema.safeParse({
      pickupFeeAmount: 5,
      pickupFeeCurrency: 'USD',
      requireOrgApproval: false,
      defaultDailyShipments: 50,
      defaultMonthlyShipments: 1000,
      defaultMaxPackageValueUsd: 500,
      defaultCodDailyLimitUsd: 200,
      defaultEnabledFeatures: ['CREATE_SHIPMENT'],
      driverSelfAssignmentEnabled: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.platformCurrency).toBe('USD');
      expect(parsed.data.pickupFeeCurrency).toBe('USD');
      expect(parsed.data.driverSelfAssignmentEnabled).toBe(true);
    }
  });

  it('rejects currencies other than USD and CDF', () => {
    expect(
      updatePlatformSettingsSchema.safeParse({
        pickupFeeAmount: 5,
        platformCurrency: 'EUR',
        requireOrgApproval: false,
        defaultDailyShipments: 50,
        defaultMonthlyShipments: 1000,
        defaultMaxPackageValueUsd: 500,
        defaultCodDailyLimitUsd: 200,
        defaultEnabledFeatures: ['CREATE_SHIPMENT'],
        driverSelfAssignmentEnabled: false,
      }).success,
    ).toBe(false);
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
      lockerCollectionAmount: 2,
      returnLockerAmount: 3,
    };
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'USD' }).success).toBe(true);
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'CDF' }).success).toBe(true);
    expect(updateDeliveryPricingSchema.safeParse({ ...base }).success).toBe(true);
    expect(updateDeliveryPricingSchema.safeParse({ ...base, currency: 'EUR' }).success).toBe(false);
  });
});
