import { describe, expect, it } from 'vitest';
import { orderLockerStops } from './courier-route.js';

const origin = { latitude: 0, longitude: 0 };

describe('orderLockerStops', () => {
  it('visits the nearest locker first, then the next nearest from there', () => {
    const stops = [
      { id: 'far', latitude: 2, longitude: 2 },
      { id: 'near', latitude: 0.1, longitude: 0.1 },
      { id: 'mid', latitude: 0.4, longitude: 0.4 },
    ];

    expect(orderLockerStops(origin, stops).map((stop) => stop.id)).toEqual([
      'near',
      'mid',
      'far',
    ]);
  });

  it('keeps one entry per locker', () => {
    const stops = [
      { id: 'a', latitude: 0.1, longitude: 0.1 },
      { id: 'a', latitude: 0.1, longitude: 0.1 },
      { id: 'b', latitude: 1, longitude: 1 },
    ];

    expect(orderLockerStops(origin, stops).map((stop) => stop.id)).toEqual(['a', 'b']);
  });

  it('appends lockers without coordinates after located stops', () => {
    const stops = [
      { id: 'unknown', latitude: null, longitude: null },
      { id: 'near', latitude: 0.1, longitude: 0.1 },
    ];

    expect(orderLockerStops(origin, stops).map((stop) => stop.id)).toEqual([
      'near',
      'unknown',
    ]);
  });
});
