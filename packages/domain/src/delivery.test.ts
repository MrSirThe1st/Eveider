import { describe, expect, it } from 'vitest';
import { canCreateReturnLeg, isActiveDeliveryStatus, isTerminalDeliveryStatus } from './delivery.js';

describe('delivery helpers', () => {
  it('identifies active and terminal statuses', () => {
    expect(isActiveDeliveryStatus('assigned')).toBe(true);
    expect(isActiveDeliveryStatus('completed')).toBe(false);
    expect(isTerminalDeliveryStatus('failed')).toBe(true);
    expect(isTerminalDeliveryStatus('scanned')).toBe(false);
  });

  it('allows a return leg only at the locker after a completed outbound', () => {
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(true);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'delivered_to_locker',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(true);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: true,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'in_transit',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: false,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
        hasCompletedReturn: true,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: false,
        merchantDropoffArrived: true,
      }),
    ).toBe(true);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: false,
        merchantDropoffArrived: true,
        hasCompletedReturn: true,
      }),
    ).toBe(false);
  });
});
