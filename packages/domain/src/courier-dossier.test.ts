import { describe, expect, it } from 'vitest';
import {
  assertCourierDossierTransition,
  canTransitionCourierDossier,
  isAssignableCourierDossier,
} from './courier-dossier.js';

describe('courier dossier status machine', () => {
  it('allows review outcomes from pending_review', () => {
    expect(canTransitionCourierDossier('pending_review', 'approved')).toBe(true);
    expect(canTransitionCourierDossier('pending_review', 'needs_correction')).toBe(true);
    expect(canTransitionCourierDossier('pending_review', 'rejected')).toBe(true);
    expect(canTransitionCourierDossier('pending_review', 'active')).toBe(false);
  });

  it('requires invite after approval before the courier is active', () => {
    expect(canTransitionCourierDossier('approved', 'invited')).toBe(true);
    expect(canTransitionCourierDossier('approved', 'active')).toBe(false);
    expect(canTransitionCourierDossier('invited', 'active')).toBe(true);
  });

  it('allows deactivate and contractor reactivate', () => {
    expect(canTransitionCourierDossier('active', 'deactivated')).toBe(true);
    expect(canTransitionCourierDossier('deactivated', 'active')).toBe(true);
    expect(canTransitionCourierDossier('deactivated', 'pending_review')).toBe(false);
  });

  it('rejects illegal transitions', () => {
    expect(() => assertCourierDossierTransition('rejected', 'approved')).toThrow(/invalide/);
  });

  it('treats KYC-approved dossiers as assignable', () => {
    expect(isAssignableCourierDossier('active')).toBe(true);
    expect(isAssignableCourierDossier('invited')).toBe(true);
    expect(isAssignableCourierDossier('approved')).toBe(true);
    expect(isAssignableCourierDossier('pending_review')).toBe(false);
    expect(isAssignableCourierDossier('deactivated')).toBe(false);
    expect(isAssignableCourierDossier('pending_review', 'business')).toBe(true);
  });
});
