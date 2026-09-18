import { describe, expect, it } from 'vitest';
import {
  lockerActionAuthorizeSchema,
  lockerActionConfirmSchema,
} from './locker-action.js';

describe('lockerActionAuthorizeSchema', () => {
  it('accepts discriminated Flow 1 driver deposit without business conclusions', () => {
    const parsed = lockerActionAuthorizeSchema.safeParse({
      action: 'deposit',
      actorType: 'eveider_driver',
      driverId: '11111111-1111-4111-8111-111111111111',
      trackingNumber: 'EVD26A7K3M2PX',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects recipient collection without a PIN', () => {
    expect(
      lockerActionAuthorizeSchema.safeParse({
        action: 'recipient_collection',
        actorType: 'recipient',
        phone: '+243800000000',
        trackingNumber: 'EVD26A7K3M2PX',
      }).success,
    ).toBe(false);
  });

  it('rejects Node-RED business conclusions as unknown fields on the union', () => {
    const parsed = lockerActionAuthorizeSchema.safeParse({
      action: 'recipient_collection',
      actorType: 'recipient',
      phone: '+243800000000',
      trackingNumber: 'EVD26A7K3M2PX',
      pickupPin: '482913',
      parcelPaid: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('parcelPaid');
    }
  });

  it('requires a return code for recipient deposit', () => {
    expect(
      lockerActionAuthorizeSchema.safeParse({
        action: 'deposit',
        actorType: 'recipient',
        phone: '+243800000000',
        trackingNumber: 'EVD26A7K3M2PX',
      }).success,
    ).toBe(false);
  });
});

describe('lockerActionConfirmSchema', () => {
  it('accepts a minimal physical success payload', () => {
    expect(lockerActionConfirmSchema.safeParse({}).success).toBe(true);
    expect(
      lockerActionConfirmSchema.safeParse({
        result: 'success',
        deviceEventId: 'plc-42',
      }).success,
    ).toBe(true);
  });
});
