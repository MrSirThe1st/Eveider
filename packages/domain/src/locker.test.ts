import { describe, expect, it } from 'vitest';
import {
  canAcceptDropOff,
  canAssignCompartment,
  canTransitionCompartment,
  canTransitionLocker,
  isLockerSelectable,
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
