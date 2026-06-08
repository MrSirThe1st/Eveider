import { describe, expect, it } from 'vitest';
import { canTransitionParcel, transitionParcel } from './index.js';

describe('parcel lifecycle', () => {
  it('allows valid transitions', () => {
    expect(canTransitionParcel('created', 'in_transit')).toBe(true);
    expect(transitionParcel('created', 'in_transit')).toBe('in_transit');
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionParcel('created', 'collected')).toBe(false);
    expect(() => transitionParcel('created', 'collected')).toThrow(
      'Invalid parcel transition: created → collected',
    );
  });
});
