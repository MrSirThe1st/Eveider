import { describe, expect, it } from 'vitest';
import { isDrcCity, matchDrcCity } from './cities.js';

describe('matchDrcCity', () => {
  it('finds a city in an address', () => {
    expect(matchDrcCity('Av. Sendwe, Kampemba, Lubumbashi')).toBe('Lubumbashi');
  });

  it('prefers the longer city name when several match', () => {
    expect(matchDrcCity('Mwene-Ditu centre')).toBe('Mwene-Ditu');
  });

  it('returns null when no city is present', () => {
    expect(matchDrcCity('Avenue du Commerce')).toBeNull();
  });
});

describe('isDrcCity', () => {
  it('accepts known cities', () => {
    expect(isDrcCity('Goma')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isDrcCity('Paris')).toBe(false);
  });
});
