import { describe, expect, it } from 'vitest';
import {
  canCreateReturnLeg,
  canTransitionDelivery,
  isActiveDeliveryStatus,
  isCustomerReturnDeliveryKind,
  isLegacyRtsDeliveryKind,
  isTerminalDeliveryStatus,
  matchesLegacyRtsReturnEligibility,
} from './delivery.js';

describe('delivery helpers', () => {
  it('identifies active and terminal statuses', () => {
    expect(isActiveDeliveryStatus('assigned')).toBe(true);
    expect(isActiveDeliveryStatus('completed')).toBe(false);
    expect(isTerminalDeliveryStatus('failed')).toBe(true);
    expect(isTerminalDeliveryStatus('scanned')).toBe(false);
  });

  it('does not allow creating new RTS return legs', () => {
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'delivered_to_locker',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
    expect(
      canCreateReturnLeg({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: false,
        merchantDropoffArrived: true,
      }),
    ).toBe(false);
  });

  it('preserves frozen RTS eligibility for historical interpretation', () => {
    expect(
      matchesLegacyRtsReturnEligibility({
        parcelStatus: 'ready_for_pickup',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(true);
    expect(
      matchesLegacyRtsReturnEligibility({
        parcelStatus: 'in_transit',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
    expect(
      matchesLegacyRtsReturnEligibility({
        parcelStatus: 'collected',
        hasActiveDelivery: false,
        hasCompletedOutbound: true,
      }),
    ).toBe(false);
  });

  it('keeps customer_return distinct from historical RTS', () => {
    expect(isLegacyRtsDeliveryKind('return')).toBe(true);
    expect(isCustomerReturnDeliveryKind('customer_return')).toBe(true);
    expect(isCustomerReturnDeliveryKind('return')).toBe(false);
    expect(canTransitionDelivery('scanned', 'completed', 'customer_return')).toBe(true);
    expect(canTransitionDelivery('scanned', 'drop_off_pending', 'customer_return')).toBe(false);
    expect(canTransitionDelivery('scanned', 'drop_off_pending', 'outbound')).toBe(true);
  });
});
