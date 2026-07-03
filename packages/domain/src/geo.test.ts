import { describe, expect, it } from 'vitest';
import {
  buildCompartmentLabels,
  formatDistanceKm,
  haversineDistanceKm,
  sortByDistance,
} from './geo.js';

describe('haversineDistanceKm', () => {
  it('returns zero for identical points', () => {
    const point = { latitude: -4.32, longitude: 15.31 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it('computes a plausible distance between Kinshasa points', () => {
    const gombe = { latitude: -4.3044, longitude: 15.3044 };
    const limete = { latitude: -4.3381, longitude: 15.3136 };
    const distance = haversineDistanceKm(gombe, limete);
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(6);
  });
});

describe('buildCompartmentLabels', () => {
  it('builds row-column labels', () => {
    expect(buildCompartmentLabels(2, 3)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
  });
});

describe('sortByDistance', () => {
  it('orders items by proximity', () => {
    const origin = { latitude: 0, longitude: 0 };
    const items = [
      { id: 'far', latitude: 1, longitude: 1 },
      { id: 'near', latitude: 0.01, longitude: 0.01 },
    ];

    const sorted = sortByDistance(origin, items);
    expect(sorted[0]?.id).toBe('near');
    expect(sorted[0]?.distanceKm).toBeLessThan(sorted[1]?.distanceKm ?? Infinity);
  });
});

describe('formatDistanceKm', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistanceKm(0.45)).toBe('450 m');
  });

  it('formats longer distances in kilometers', () => {
    expect(formatDistanceKm(2.34)).toBe('2.3 km');
  });
});
