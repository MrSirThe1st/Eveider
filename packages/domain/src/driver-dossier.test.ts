import { describe, expect, it } from 'vitest';
import {
  deriveDriverOperationalStatus,
  isAssignableDriverDossier,
} from './driver-dossier.js';

describe('driver operational status', () => {
  it('treats KYC review as pending approval even with an active delivery', () => {
    expect(
      deriveDriverOperationalStatus({
        dossierStatus: 'pending_review',
        hasActiveDelivery: true,
      }),
    ).toBe('pending_approval');
  });

  it('treats blocked or deactivated drivers as suspended', () => {
    expect(
      deriveDriverOperationalStatus({
        dossierStatus: 'active',
        isBlocked: true,
        hasActiveDelivery: true,
      }),
    ).toBe('suspended');
    expect(
      deriveDriverOperationalStatus({
        dossierStatus: 'deactivated',
        hasActiveDelivery: false,
      }),
    ).toBe('suspended');
  });

  it('uses on-delivery after KYC approval when a delivery is in progress', () => {
    expect(
      deriveDriverOperationalStatus({
        dossierStatus: 'active',
        hasActiveDelivery: true,
      }),
    ).toBe('on_delivery');
  });

  it('defaults approved drivers without a live delivery to available', () => {
    expect(
      deriveDriverOperationalStatus({
        dossierStatus: 'invited',
        hasActiveDelivery: false,
      }),
    ).toBe('available');
  });
});

describe('assignable driver dossiers', () => {
  it('allows assignment after KYC approval, not during review', () => {
    expect(isAssignableDriverDossier('pending_review')).toBe(false);
    expect(isAssignableDriverDossier('needs_correction')).toBe(false);
    expect(isAssignableDriverDossier('rejected')).toBe(false);
    expect(isAssignableDriverDossier('approved')).toBe(true);
    expect(isAssignableDriverDossier('invited')).toBe(true);
    expect(isAssignableDriverDossier('active')).toBe(true);
    expect(isAssignableDriverDossier('deactivated')).toBe(false);
  });
});
