import { describe, expect, it } from 'vitest';
import {
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  transitionBusiness,
} from './business.js';

describe('business account lifecycle', () => {
  it('allows approval and admin actions', () => {
    expect(canTransitionBusiness('pending', 'active')).toBe(true);
    expect(canTransitionBusiness('active', 'suspended')).toBe(true);
    expect(canTransitionBusiness('blocked', 'active')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionBusiness('pending', 'suspended')).toBe(false);
    expect(() => transitionBusiness('pending', 'suspended')).toThrow(
      'Invalid business transition: pending → suspended',
    );
  });

  it('only active businesses can submit parcels', () => {
    expect(canSubmitParcelsAsBusiness('active')).toBe(true);
    expect(canSubmitParcelsAsBusiness('pending')).toBe(false);
    expect(canSubmitParcelsAsBusiness('suspended')).toBe(false);
    expect(canSubmitParcelsAsBusiness('blocked')).toBe(false);
  });
});
