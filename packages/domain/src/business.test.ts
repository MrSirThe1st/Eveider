import { describe, expect, it } from 'vitest';
import {
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  transitionBusiness,
} from './business.js';

describe('business account lifecycle', () => {
  it('allows onboarding and approval transitions', () => {
    expect(canTransitionBusiness('draft', 'onboarding')).toBe(true);
    expect(canTransitionBusiness('onboarding', 'pending_review')).toBe(true);
    expect(canTransitionBusiness('pending_review', 'active')).toBe(true);
    expect(canTransitionBusiness('pending_review', 'pending_correction')).toBe(true);
    expect(canTransitionBusiness('pending_correction', 'pending_review')).toBe(true);
    expect(canTransitionBusiness('active', 'suspended')).toBe(true);
    expect(canTransitionBusiness('blocked', 'active')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionBusiness('draft', 'active')).toBe(false);
    expect(() => transitionBusiness('draft', 'active')).toThrow(
      "Transition d'état entreprise invalide: draft → active",
    );
  });

  it('only active businesses can submit parcels', () => {
    expect(canSubmitParcelsAsBusiness('active')).toBe(true);
    expect(canSubmitParcelsAsBusiness('pending_review')).toBe(false);
    expect(canSubmitParcelsAsBusiness('pending_correction')).toBe(false);
    expect(canSubmitParcelsAsBusiness('onboarding')).toBe(false);
    expect(canSubmitParcelsAsBusiness('suspended')).toBe(false);
    expect(canSubmitParcelsAsBusiness('blocked')).toBe(false);
  });
});
