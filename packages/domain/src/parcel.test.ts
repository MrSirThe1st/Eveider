import { describe, expect, it } from 'vitest';
import {
  canTransitionParcel,
  isTerminalParcelStatus,
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
    ]);
  });

  it('allows valid transitions', () => {
    expect(canTransitionParcel('created', 'in_transit')).toBe(true);
    expect(transitionParcel('ready_for_pickup', 'collected')).toBe('collected');
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionParcel('created', 'collected')).toBe(false);
    expect(() => transitionParcel('created', 'collected')).toThrow(
      'Invalid parcel transition: created → collected',
    );
  });

  it('marks collected as terminal', () => {
    expect(isTerminalParcelStatus('collected')).toBe(true);
    expect(isTerminalParcelStatus('in_transit')).toBe(false);
  });
});
