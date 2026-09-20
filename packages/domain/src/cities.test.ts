import { describe, expect, it } from 'vitest';
import { DRC_CITIES, DRC_CITY_SEEDS, isDrcCity, matchDrcCity } from './cities.js';

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

describe('DRC_CITY_SEEDS', () => {
  it('covers every DRC city name exactly once', () => {
    expect(DRC_CITY_SEEDS.map((row) => row.name)).toEqual([...DRC_CITIES]);
  });

  it('assigns KIN / LSH / KWZ to the operating cities', () => {
    expect(DRC_CITY_SEEDS.find((row) => row.name === 'Kinshasa')?.code).toBe('KIN');
    expect(DRC_CITY_SEEDS.find((row) => row.name === 'Lubumbashi')?.code).toBe('LSH');
    expect(DRC_CITY_SEEDS.find((row) => row.name === 'Kolwezi')?.code).toBe('KWZ');
  });
});
