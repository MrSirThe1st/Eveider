import { describe, expect, it } from 'vitest';
import {
  collectionCredentialShouldActivate,
  collectionSyncChangeType,
  isDepositPhysicallySuccessful,
  isRemovalPhysicallySuccessful,
} from './locker-collection.js';

describe('collection credential activation', () => {
  it('activates only when the commercial layer authorizes collection', () => {
    expect(collectionCredentialShouldActivate({ authorized: true })).toBe(true);
    expect(collectionCredentialShouldActivate({ authorized: false })).toBe(false);
  });

  it('does not publish pending or never-activated revokes to the locker', () => {
    expect(collectionSyncChangeType('pending', false)).toBeNull();
    expect(collectionSyncChangeType('revoked', false)).toBeNull();
    expect(collectionSyncChangeType('active', false)).toBe('activate');
    expect(collectionSyncChangeType('consumed', true)).toBe('consume');
    expect(collectionSyncChangeType('revoked', true)).toBe('revoke');
  });
});

describe('physical success criteria', () => {
  it('does not treat an OPEN command as a deposit', () => {
    expect(
      isDepositPhysicallySuccessful({
        doorOpened: true,
        doorClosed: false,
        occupancy: 'unknown',
        occupancyRequired: false,
      }),
    ).toBe(false);
    expect(
      isDepositPhysicallySuccessful({
        doorOpened: true,
        doorClosed: true,
        occupancy: 'occupied',
        occupancyRequired: true,
      }),
    ).toBe(true);
  });

  it('requires empty occupancy for removal when sensing is enabled', () => {
    expect(
      isRemovalPhysicallySuccessful({
        doorOpened: true,
        doorClosed: true,
        occupancy: 'occupied',
        occupancyRequired: true,
      }),
    ).toBe(false);
    expect(
      isRemovalPhysicallySuccessful({
        doorOpened: true,
        doorClosed: true,
        occupancy: 'empty',
        occupancyRequired: true,
      }),
    ).toBe(true);
  });
});
