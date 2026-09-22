import { describe, expect, it } from 'vitest';
import {
  DRC_CITIES,
  DRC_GEOGRAPHY,
  drcCityProvince,
  isDrcCity,
  matchDrcCity,
} from './cities.js';

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
  it('accepts catalog cities', () => {
    expect(isDrcCity('Goma')).toBe(true);
    expect(isDrcCity('Beni')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isDrcCity('Paris')).toBe(false);
  });
});

describe('drcCityProvince', () => {
  it('attaches the catalog province to operating cities', () => {
    expect(drcCityProvince('Kolwezi')).toBe('Lualaba');
    expect(drcCityProvince('Lubumbashi')).toBe('Haut-Katanga');
    expect(drcCityProvince('Goma')).toBe('Nord-Kivu');
    expect(drcCityProvince('Kinshasa')).toBe('Kinshasa');
    expect(drcCityProvince('Likasi')).toBe('Haut-Katanga');
  });

  it('returns null for a name that is not in the catalog', () => {
    expect(drcCityProvince('Goma KWZ1')).toBeNull();
  });
});

describe('DRC_GEOGRAPHY', () => {
  it('lists unique city names', () => {
    expect(new Set(DRC_CITIES).size).toBe(DRC_CITIES.length);
  });

  it('covers every catalog city exactly once', () => {
    expect(DRC_CITIES).toEqual(DRC_GEOGRAPHY.flatMap((group) => [...group.cities]));
  });
});
