import { describe, expect, it } from 'vitest';
import {
  compartmentFitsParcelSize,
  suggestCompartmentForParcelSize,
} from './locker-settings.js';

describe('compartmentFitsParcelSize', () => {
  it('allows the same size or a larger compartment', () => {
    expect(compartmentFitsParcelSize('small', 'small')).toBe(true);
    expect(compartmentFitsParcelSize('medium', 'small')).toBe(true);
    expect(compartmentFitsParcelSize('large', 'medium')).toBe(true);
  });

  it('rejects a compartment smaller than the parcel', () => {
    expect(compartmentFitsParcelSize('small', 'medium')).toBe(false);
    expect(compartmentFitsParcelSize('small', 'large')).toBe(false);
    expect(compartmentFitsParcelSize('medium', 'large')).toBe(false);
  });
});

describe('suggestCompartmentForParcelSize', () => {
  const compartments = [
    { id: '1', label: 'A1', size: 'large' as const },
    { id: '2', label: 'A2', size: 'small' as const },
    { id: '3', label: 'A3', size: 'medium' as const },
  ];

  it('picks the smallest compartment that still fits', () => {
    expect(suggestCompartmentForParcelSize(compartments, 'small')?.label).toBe('A2');
    expect(suggestCompartmentForParcelSize(compartments, 'medium')?.label).toBe('A3');
    expect(suggestCompartmentForParcelSize(compartments, 'large')?.label).toBe('A1');
  });

  it('returns null when nothing fits', () => {
    const suggested = suggestCompartmentForParcelSize(
      [{ id: '1', label: 'A1', size: 'small' }],
      'large',
    );
    expect(suggested).toBeNull();
  });
});
