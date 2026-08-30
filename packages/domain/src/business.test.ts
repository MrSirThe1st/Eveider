import { describe, expect, it } from 'vitest';
import {
  canEditOrganizationVerification,
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  deriveOrganizationVerificationStatus,
  isOrganizationVerificationPending,
  isOrganizationVerified,
  normalizeAdminAccountStatus,
  operationalStatusAfterVerificationApproval,
  transitionBusiness,
} from './business.js';

describe('business account lifecycle', () => {
  it('allows operational transitions independently of KYC', () => {
    expect(canTransitionBusiness('active', 'suspended')).toBe(true);
    expect(canTransitionBusiness('active', 'blocked')).toBe(true);
    expect(canTransitionBusiness('blocked', 'active')).toBe(true);
    expect(canTransitionBusiness('onboarding', 'active')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionBusiness('draft', 'suspended')).toBe(true);
    expect(() => transitionBusiness('draft', 'onboarding')).toThrow(
      "Transition d'état entreprise invalide: draft → onboarding",
    );
  });

  it('only operationally active organizations can submit parcels', () => {
    expect(canSubmitParcelsAsBusiness('active')).toBe(true);
    expect(canSubmitParcelsAsBusiness('pending_review')).toBe(false);
    expect(canSubmitParcelsAsBusiness('pending_correction')).toBe(false);
    expect(canSubmitParcelsAsBusiness('onboarding')).toBe(false);
    expect(canSubmitParcelsAsBusiness('suspended')).toBe(false);
    expect(canSubmitParcelsAsBusiness('blocked')).toBe(false);
  });

  it('does not use KYC leftovers as the operational status after approval', () => {
    expect(operationalStatusAfterVerificationApproval('onboarding')).toBe('active');
    expect(operationalStatusAfterVerificationApproval('pending_review')).toBe('active');
    expect(operationalStatusAfterVerificationApproval('active')).toBe('active');
    expect(operationalStatusAfterVerificationApproval('suspended')).toBe('suspended');
    expect(operationalStatusAfterVerificationApproval('blocked')).toBe('blocked');
  });

  it('maps legacy account rows to active in admin UI', () => {
    expect(normalizeAdminAccountStatus('pending_review')).toBe('active');
    expect(normalizeAdminAccountStatus('blocked')).toBe('suspended');
    expect(normalizeAdminAccountStatus('suspended')).toBe('suspended');
  });
});

describe('organization verification', () => {
  it('treats a missing verification row as not started', () => {
    expect(deriveOrganizationVerificationStatus(null)).toBe('not_started');
    expect(deriveOrganizationVerificationStatus('pending')).toBe('pending');
  });

  it('allows editing until the dossier is in review or approved', () => {
    expect(canEditOrganizationVerification('not_started')).toBe(true);
    expect(canEditOrganizationVerification('correction_requested')).toBe(true);
    expect(canEditOrganizationVerification('rejected')).toBe(true);
    expect(canEditOrganizationVerification('pending')).toBe(false);
    expect(canEditOrganizationVerification('approved')).toBe(false);
  });

  it('distinguishes pending review from verified', () => {
    expect(isOrganizationVerificationPending('pending')).toBe(true);
    expect(isOrganizationVerified('approved')).toBe(true);
    expect(isOrganizationVerified('pending')).toBe(false);
  });
});
