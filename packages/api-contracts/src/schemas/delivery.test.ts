import { describe, expect, it } from 'vitest';
import {
  claimDeliverySchema,
  completeDropOffSchema,
  confirmPickupSchema,
  updateDriverAvailabilitySchema,
} from './delivery.js';

describe('completeDropOffSchema', () => {
  it('requires a drop-off photo', () => {
    expect(completeDropOffSchema.safeParse({}).success).toBe(false);
    expect(
      completeDropOffSchema.safeParse({
        photoBase64: `data:image/jpeg;base64,${'A'.repeat(40)}`,
      }).success,
    ).toBe(true);
  });
});

describe('confirmPickupSchema', () => {
  it('accepts scan and manual modes', () => {
    expect(
      confirmPickupSchema.safeParse({ mode: 'scan', reference: 'EVD-1' }).success,
    ).toBe(true);
    expect(confirmPickupSchema.safeParse({ mode: 'manual' }).success).toBe(true);
    expect(confirmPickupSchema.safeParse({ mode: 'scan' }).success).toBe(false);
  });
});

describe('claimDeliverySchema', () => {
  it('requires parcelId', () => {
    expect(claimDeliverySchema.safeParse({}).success).toBe(false);
    expect(
      claimDeliverySchema.safeParse({
        parcelId: '00000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(true);
  });
});

describe('updateDriverAvailabilitySchema', () => {
  it('requires isAcceptingWork boolean', () => {
    expect(updateDriverAvailabilitySchema.safeParse({}).success).toBe(false);
    expect(updateDriverAvailabilitySchema.safeParse({ isAcceptingWork: true }).success).toBe(
      true,
    );
  });
});
