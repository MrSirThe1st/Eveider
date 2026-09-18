import { describe, expect, it } from 'vitest';
import {
  adminAdvanceableParcelStatuses,
  canPrepareParcelCollection,
  canTransitionParcel,
  canTransitionParcelForPickup,
  isDepositOnlyParcelStatus,
  isParcelAtPoint,
  isParcelPreHandoff,
  isTerminalParcelStatus,
  PARCEL_AT_POINT_STATUS,
  PARCEL_STATUSES,
  transitionParcel,
} from './parcel.js';

describe('parcel lifecycle', () => {
  it('defines the canonical status order', () => {
    expect(PARCEL_STATUSES).toEqual([
      'created',
      'in_transit',
      'delivered_to_locker',
      'ready_for_pickup',
      'collected',
      'return_at_point',
      'returning',
      'returned',
    ]);
    expect(PARCEL_AT_POINT_STATUS).toBe('delivered_to_locker');
  });

  it('allows valid transitions', () => {
    expect(canTransitionParcel('created', 'in_transit')).toBe(true);
    expect(canTransitionParcel('created', 'delivered_to_locker')).toBe(true);
    expect(canTransitionParcel('delivered_to_locker', 'ready_for_pickup')).toBe(true);
    expect(transitionParcel('ready_for_pickup', 'collected')).toBe('collected');
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionParcel('created', 'collected')).toBe(false);
    expect(() => transitionParcel('created', 'collected')).toThrow(
      'Invalid parcel transition: created → collected',
    );
  });

  it('never lets merchant drop-off enter in_transit', () => {
    expect(canTransitionParcelForPickup('created', 'in_transit', 'courier_pickup')).toBe(true);
    expect(canTransitionParcelForPickup('created', 'in_transit', 'merchant_dropoff')).toBe(false);
    expect(canTransitionParcelForPickup('created', 'delivered_to_locker', 'merchant_dropoff')).toBe(
      true,
    );
  });

  it('treats created as pre-handoff and delivered_to_locker as AT_POINT', () => {
    expect(isParcelPreHandoff('created')).toBe(true);
    expect(isParcelAtPoint('delivered_to_locker')).toBe(true);
    expect(isParcelAtPoint('ready_for_pickup')).toBe(false);
    expect(isDepositOnlyParcelStatus('delivered_to_locker')).toBe(true);
    expect(canPrepareParcelCollection('delivered_to_locker')).toBe(true);
    expect(canPrepareParcelCollection('ready_for_pickup')).toBe(true);
    expect(canPrepareParcelCollection('in_transit')).toBe(false);
  });

  it('hides AT_POINT from admin status buttons', () => {
    expect(adminAdvanceableParcelStatuses('created')).toEqual(['in_transit']);
    expect(adminAdvanceableParcelStatuses('in_transit')).toEqual([]);
    expect(adminAdvanceableParcelStatuses('delivered_to_locker')).toEqual(['ready_for_pickup']);
    expect(adminAdvanceableParcelStatuses('ready_for_pickup')).toEqual(['collected']);
    expect(adminAdvanceableParcelStatuses('collected')).toEqual([]);
  });

  it('marks returned as terminal and collected as outbound-complete', () => {
    expect(isTerminalParcelStatus('returned')).toBe(true);
    expect(isTerminalParcelStatus('collected')).toBe(false);
    expect(isTerminalParcelStatus('in_transit')).toBe(false);
  });
});
