import { describe, expect, it } from 'vitest';
import {
  canCreateReturnLeg,
  canTransitionDelivery,
  isActiveDeliveryStatus,
  isCustomerReturnDeliveryKind,
  isLegacyRtsDeliveryKind,
  isPhysicalWorkDeliveryStatus,
  isTerminalDeliveryStatus,
  matchesLegacyRtsReturnEligibility,
  toDriverDeliveryPresentationStatus,
} from './delivery.js';

describe('delivery helpers', () => {
  it('identifies active and terminal statuses', () => {
    expect(isActiveDeliveryStatus('assigned')).toBe(true);
    expect(isActiveDeliveryStatus('accepted')).toBe(true);
    expect(isActiveDeliveryStatus('started')).toBe(true);
    expect(isActiveDeliveryStatus('completed')).toBe(false);
    expect(isTerminalDeliveryStatus('failed')).toBe(true);
    expect(isTerminalDeliveryStatus('scanned')).toBe(false);
    expect(isPhysicalWorkDeliveryStatus('started')).toBe(true);
    expect(isPhysicalWorkDeliveryStatus('accepted')).toBe(false);
  });

  it('maps driver presentation buckets', () => {
    expect(toDriverDeliveryPresentationStatus('assigned')).toBe('awaiting_accept');
    expect(toDriverDeliveryPresentationStatus('accepted')).toBe('ready_to_start');
    expect(toDriverDeliveryPresentationStatus('started')).toBe('in_progress');
    expect(toDriverDeliveryPresentationStatus('scanned')).toBe('in_progress');
    expect(toDriverDeliveryPresentationStatus('drop_off_pending')).toBe('in_progress');
  });

  it('enforces assignment gates before physical work', () => {
    expect(canTransitionDelivery('assigned', 'accepted')).toBe(true);
    expect(canTransitionDelivery('assigned', 'scanned')).toBe(false);
    expect(canTransitionDelivery('accepted', 'started')).toBe(true);
    expect(canTransitionDelivery('started', 'scanned')).toBe(true);
    expect(canTransitionDelivery('started', 'drop_off_pending')).toBe(false);
    expect(canTransitionDelivery('scanned', 'drop_off_pending')).toBe(true);
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
    expect(canTransitionDelivery('started', 'scanned', 'customer_return')).toBe(true);
    expect(canTransitionDelivery('started', 'completed', 'customer_return')).toBe(false);
  });
});
