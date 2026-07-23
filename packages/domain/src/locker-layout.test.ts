import { describe, expect, it } from 'vitest';
import {
  cycleCompartmentSize,
  deriveLockerCodePrefix,
  formatLockerCode,
  lockerCapacity,
  resizeLayoutCells,
  resolveLockerLayout,
  suggestLockerName,
} from './locker-layout.js';

describe('resolveLockerLayout', () => {
  it('builds a 3x3 grid', () => {
    const layout = resolveLockerLayout('3x3');
    expect(layout.rows).toBe(3);
    expect(layout.columns).toBe(3);
    expect(lockerCapacity(layout)).toBe(9);
  });

  it('preserves cell sizes when resizing a custom grid', () => {
    const initial = resolveLockerLayout('3x3');
    const customized = initial.cells.map((cell, index) =>
      index === 0 ? { ...cell, size: 'large' as const } : cell,
    );
    const resized = resizeLayoutCells(4, 4, customized);
    expect(resized).toHaveLength(16);
    expect(resized.find((cell) => cell.label === 'A1')?.size).toBe('large');
    expect(resized.find((cell) => cell.label === 'D4')?.size).toBe('medium');
  });

  it('normalizes compartment count when preset changes', () => {
    const from4x4 = resolveLockerLayout('4x4');
    const switched = resolveLockerLayout('3x3', undefined, undefined, from4x4.cells);

    expect(switched.rows).toBe(3);
    expect(switched.columns).toBe(3);
    expect(switched.cells).toHaveLength(9);
    expect(switched.cells.every((cell) => cell.size === 'medium')).toBe(true);
  });
});

describe('cycleCompartmentSize', () => {
  it('cycles through sizes', () => {
    expect(cycleCompartmentSize('small')).toBe('medium');
    expect(cycleCompartmentSize('medium')).toBe('large');
    expect(cycleCompartmentSize('large')).toBe('small');
  });
});

describe('locker code helpers', () => {
  it('derives city prefixes', () => {
    expect(deriveLockerCodePrefix('Avenue Kasa Vubu, Kolwezi')).toBe('KOL');
    expect(deriveLockerCodePrefix('Kinshasa')).toBe('KIN');
  });

  it('formats locker codes', () => {
    expect(formatLockerCode('KOL', 14)).toBe('KOL-014');
  });
});

describe('suggestLockerName', () => {
  it('suggests street-based names', () => {
    expect(suggestLockerName('Avenue Kasa Vubu, Kolwezi')).toBe('Avenue Kasa Vubu Point');
  });

  it('suggests city centre names', () => {
    expect(suggestLockerName('Kolwezi')).toBe('Kolwezi Centre');
  });
});
