import { describe, expect, it } from 'vitest';
import {
  isValidLatitude,
  isValidLongitude,
  isWithinDrcBounds,
  parseCoordinateInput,
  placeTypeLabel,
  rankPlaceType,
  zoomForPlaceType,
  type MapBounds,
  DRC_BOUNDS,
} from './google-maps';

describe('parseCoordinateInput', () => {
  it('parses decimal coordinates', () => {
    expect(parseCoordinateInput('-4.3217')).toBe(-4.3217);
    expect(parseCoordinateInput('15,3125')).toBe(15.3125);
  });

  it('returns null for invalid values', () => {
    expect(parseCoordinateInput('')).toBeNull();
    expect(parseCoordinateInput('abc')).toBeNull();
  });
});

describe('coordinate validation', () => {
  it('validates latitude bounds', () => {
    expect(isValidLatitude(-4.32)).toBe(true);
    expect(isValidLatitude(91)).toBe(false);
  });

  it('validates longitude bounds', () => {
    expect(isValidLongitude(15.31)).toBe(true);
    expect(isValidLongitude(-181)).toBe(false);
  });

  it('checks DRC bounds', () => {
    expect(isWithinDrcBounds(-4.32, 15.31)).toBe(true);
    expect(isWithinDrcBounds(48.85, 2.35)).toBe(false);
  });
});

describe('place type helpers', () => {
  it('ranks addresses above cities', () => {
    expect(rankPlaceType('street_address')).toBeLessThan(rankPlaceType('locality'));
  });

  it('returns French labels', () => {
    expect(placeTypeLabel('street_address')).toBe('Adresse');
    expect(placeTypeLabel('neighborhood')).toBe('Quartier');
  });

  it('zooms closer for addresses', () => {
    expect(zoomForPlaceType('street_address')).toBeGreaterThan(zoomForPlaceType('locality'));
  });
});

describe('DRC bounds', () => {
  it('covers Kolwezi coordinates', () => {
    expect(isWithinDrcBounds(-10.72, 25.47)).toBe(true);
  });

  it('defines a country-wide search window', () => {
    const bounds: MapBounds = DRC_BOUNDS;
    expect(bounds.east).toBeGreaterThan(bounds.west);
    expect(bounds.north).toBeGreaterThan(bounds.south);
  });
});
