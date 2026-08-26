import { describe, expect, it } from 'vitest';
import {
  compartmentFitsParcelSize,
  suggestCompartmentForParcelSize,
} from './locker-settings.js';

describe('compartmentFitsParcelSize', () => {
  it('requires exact size when mode is exact', () => {
    expect(compartmentFitsParcelSize('medium', 'small', 'exact')).toBe(false);
    expect(compartmentFitsParcelSize('small', 'small', 'exact')).toBe(true);
  });

  it('allows larger compartments when mode is exact_or_larger', () => {
    expect(compartmentFitsParcelSize('medium', 'small', 'exact_or_larger')).toBe(true);
    expect(compartmentFitsParcelSize('small', 'large', 'exact_or_larger')).toBe(false);
  });
});

describe('suggestCompartmentForParcelSize', () => {
  const compartments = [
    { id: '1', label: 'A1', size: 'large' as const },
    { id: '2', label: 'A2', size: 'small' as const },
    { id: '3', label: 'A3', size: 'medium' as const },
  ];

  it('picks the smallest fit by default', () => {
    const suggested = suggestCompartmentForParcelSize(compartments, 'small', {
      sizeMatchingMode: 'exact_or_larger',
      assignmentStrategy: 'smallest_fit',
    });
    expect(suggested?.label).toBe('A2');
  });

  it('prefers exact size when strategy is preferred_size', () => {
    const suggested = suggestCompartmentForParcelSize(compartments, 'medium', {
      sizeMatchingMode: 'exact_or_larger',
      assignmentStrategy: 'preferred_size',
    });
    expect(suggested?.label).toBe('A3');
  });

  it('returns null when nothing fits', () => {
    const suggested = suggestCompartmentForParcelSize(
      [{ id: '1', label: 'A1', size: 'small' }],
      'large',
      { sizeMatchingMode: 'exact', assignmentStrategy: 'smallest_fit' },
    );
    expect(suggested).toBeNull();
  });
});
