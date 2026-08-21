import { describe, expect, it } from 'vitest';
import {
  canAcceptDropOff,
  canAssignCompartment,
  canTransitionCompartment,
  canTransitionLocker,
  isLockerSelectable,
  lockerAvailableLabel,
  lockerNetworkCapacity,
  lockerNetworkLabel,
  lockerOperatingStatus,
  transitionCompartment,
  transitionLocker,
} from './locker.js';

describe('locker status', () => {
  it('allows operational locker transitions', () => {
    expect(canTransitionLocker('active', 'offline')).toBe(true);
    expect(canTransitionLocker('full', 'active')).toBe(true);
    expect(transitionLocker('offline', 'active')).toBe('active');
  });

  it('rejects invalid locker transitions', () => {
    expect(canTransitionLocker('offline', 'full')).toBe(false);
  });

  it('only active lockers accept drop-offs', () => {
    expect(canAcceptDropOff('active')).toBe(true);
    expect(canAcceptDropOff('offline')).toBe(false);
    expect(canAcceptDropOff('full')).toBe(false);
    expect(canAcceptDropOff('archived')).toBe(false);
  });

  it('only active lockers are selectable by customers', () => {
    expect(isLockerSelectable('active')).toBe(true);
    expect(isLockerSelectable('offline')).toBe(false);
    expect(isLockerSelectable('archived')).toBe(false);
  });

  it('supports archiving and restoring lockers', () => {
    expect(canTransitionLocker('active', 'archived')).toBe(true);
    expect(transitionLocker('archived', 'active')).toBe('active');
  });
});

describe('network directory labels', () => {
  it('formats pickup location as type — name', () => {
    expect(lockerNetworkLabel('SMART_LOCKER', 'Gombe')).toBe('Casier — Gombe');
    expect(lockerNetworkLabel('PARTNER_POINT', 'Pharmacie XYZ')).toBe(
      'Point partenaire — Pharmacie XYZ',
    );
  });

  it('uses compartment total for smart lockers and max capacity for points', () => {
    expect(
      lockerNetworkCapacity({
        type: 'SMART_LOCKER',
        compartmentTotal: 12,
        rows: 3,
        columns: 4,
      }),
    ).toBe(12);
    expect(
      lockerNetworkCapacity({
        type: 'PARTNER_POINT',
        maxCapacity: 20,
        compartmentTotal: 0,
      }),
    ).toBe(20);
  });

  it('describes remaining compartments in French', () => {
    expect(lockerAvailableLabel({ type: 'SMART_LOCKER', availableSlots: 12 })).toBe(
      '12 compartiments disponibles',
    );
    expect(lockerAvailableLabel({ type: 'SMART_LOCKER', availableSlots: 1 })).toBe(
      '1 compartiment disponible',
    );
    expect(lockerAvailableLabel({ type: 'PARTNER_POINT', availableSlots: 0 })).toBe(
      'Aucune place disponible',
    );
  });

  it('surfaces full when an active locker has no remaining slots', () => {
    expect(lockerOperatingStatus({ status: 'active', availableSlots: 0 })).toBe('full');
    expect(lockerOperatingStatus({ status: 'active', availableSlots: 3 })).toBe('active');
    expect(lockerOperatingStatus({ status: 'offline', availableSlots: 8 })).toBe('offline');
  });
});

describe('compartment status', () => {
  it('allows reservation and release flows', () => {
    expect(canTransitionCompartment('available', 'reserved')).toBe(true);
    expect(canTransitionCompartment('reserved', 'occupied')).toBe(true);
    expect(transitionCompartment('occupied', 'available')).toBe('available');
  });

  it('rejects invalid compartment transitions', () => {
    expect(canTransitionCompartment('occupied', 'reserved')).toBe(false);
  });

  it('assigns only available or reserved compartments', () => {
    expect(canAssignCompartment('available')).toBe(true);
    expect(canAssignCompartment('reserved')).toBe(true);
    expect(canAssignCompartment('occupied')).toBe(false);
  });
});
