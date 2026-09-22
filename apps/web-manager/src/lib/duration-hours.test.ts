import { describe, expect, it } from 'vitest';
import {
  MAX_DURATION_HOURS,
  clampDurationHours,
  combineDurationHours,
  durationDayOptions,
  durationHourOptions,
  formatDurationHours,
  splitDurationHours,
} from './duration-hours';

describe('duration hours', () => {
  it('splits whole hours into days and leftover hours', () => {
    expect(splitDurationHours(72)).toEqual({ days: 3, hours: 0 });
    expect(splitDurationHours(24)).toEqual({ days: 1, hours: 0 });
    expect(splitDurationHours(25)).toEqual({ days: 1, hours: 1 });
    expect(splitDurationHours(0)).toEqual({ days: 0, hours: 0 });
    expect(splitDurationHours(MAX_DURATION_HOURS)).toEqual({ days: 30, hours: 0 });
  });

  it('clamps invalid totals', () => {
    expect(clampDurationHours(Number.NaN, 1, 720)).toBe(1);
    expect(clampDurationHours(-4, 1, 720)).toBe(1);
    expect(clampDurationHours(800, 1, 720)).toBe(720);
  });

  it('recombines days and hours within bounds', () => {
    expect(combineDurationHours(3, 0, 1, 720)).toBe(72);
    expect(combineDurationHours(0, 0, 1, 720)).toBe(1);
    expect(combineDurationHours(30, 5, 0, 720)).toBe(720);
  });

  it('lists day and hour options that respect min/max', () => {
    expect(durationDayOptions(1, 720)).toEqual(Array.from({ length: 31 }, (_, index) => index));
    expect(durationHourOptions(0, 1, 720)[0]).toBe(1);
    expect(durationHourOptions(0, 1, 720)?.at(-1)).toBe(23);
    expect(durationHourOptions(30, 0, 720)).toEqual([0]);
    expect(durationHourOptions(29, 0, 720)?.at(-1)).toBe(23);
  });

  it('formats a compact French duration', () => {
    expect(formatDurationHours(0)).toBe('0 heures');
    expect(formatDurationHours(1)).toBe('1 heure');
    expect(formatDurationHours(24)).toBe('1 jour');
    expect(formatDurationHours(25)).toBe('1 jour 1 heure');
    expect(formatDurationHours(72)).toBe('3 jours');
  });
});
