import { describe, expect, it } from 'vitest';
import { canTransitionParcel } from './parcel.js';
import {
  canAssignCustomerReturnDelivery,
  canCompleteBusinessPickup,
  canDepositCustomerReturn,
  canRequestCustomerReturn,
  canTransitionParcelReturn,
  isActiveParcelReturnStatus,
  transitionParcelReturn,
} from './parcel-return.js';

describe('customer return process', () => {
  it('allows a request only after outbound collection', () => {
    expect(canRequestCustomerReturn('collected')).toBe(true);
    expect(canRequestCustomerReturn('created')).toBe(false);
    expect(canRequestCustomerReturn('in_transit')).toBe(false);
    expect(canRequestCustomerReturn('delivered_to_locker')).toBe(false);
    expect(canRequestCustomerReturn('ready_for_pickup')).toBe(false);
    expect(canRequestCustomerReturn('return_at_point')).toBe(false);
    expect(canRequestCustomerReturn('returning')).toBe(false);
    expect(canRequestCustomerReturn('returned')).toBe(false);
  });

  it('does not allow marking returned directly from collected', () => {
    expect(canTransitionParcel('collected', 'returned')).toBe(false);
  });

  it('allows requested → authorized / rejected / cancelled', () => {
    expect(canTransitionParcelReturn('requested', 'authorized')).toBe(true);
    expect(canTransitionParcelReturn('requested', 'rejected')).toBe(true);
    expect(canTransitionParcelReturn('requested', 'cancelled')).toBe(true);
    expect(() => transitionParcelReturn('rejected', 'authorized')).toThrow(
      'Invalid return transition: rejected → authorized',
    );
  });

  it('does not allow reject/cancel after physical deposit', () => {
    expect(canTransitionParcelReturn('awaiting_pickup', 'rejected')).toBe(false);
    expect(canTransitionParcelReturn('awaiting_pickup', 'cancelled')).toBe(false);
    expect(canTransitionParcelReturn('in_transit', 'cancelled')).toBe(false);
  });

  it('keeps operational rules distinct from process status', () => {
    expect(canDepositCustomerReturn('authorized')).toBe(true);
    expect(canDepositCustomerReturn('requested')).toBe(false);
    expect(canAssignCustomerReturnDelivery('awaiting_pickup', 'eveider_return')).toBe(true);
    expect(canAssignCustomerReturnDelivery('awaiting_pickup', 'business_pickup')).toBe(false);
    expect(canCompleteBusinessPickup('awaiting_pickup', 'business_pickup')).toBe(true);
    expect(canCompleteBusinessPickup('awaiting_pickup', 'eveider_return')).toBe(false);
    expect(isActiveParcelReturnStatus('requested')).toBe(true);
    expect(isActiveParcelReturnStatus('completed')).toBe(false);
  });
});
