import { describe, expect, it } from 'vitest';
import {
  formatLockerZoneLabel,
  formatZoneCoverageLabel,
  formatZoneDisplayName,
  formatZonePriceAmount,
  groupZonesByCity,
  isHoldingZoneCode,
  parsePriceInput,
  suggestCityFromAddress,
  zoneNeedsPricing,
  zonePriceKind,
  zonesForCity,
} from './geography-presentation';

describe('holding zone labels', () => {
  it('labels KIN / LSH / KWZ as city-wide holding zones', () => {
    expect(isHoldingZoneCode('KWZ')).toBe(true);
    expect(
      formatZoneDisplayName({ code: 'KWZ', name: 'Kolwezi', city: 'Kolwezi' }),
    ).toBe('Kolwezi — à répartir');
    expect(
      formatZoneCoverageLabel({ code: 'LSH', name: 'Lubumbashi', city: 'Lubumbashi' }),
    ).toBe('Lubumbashi — à répartir');
  });

  it('shows neighborhood zones as Zone (City)', () => {
    expect(
      formatZoneCoverageLabel({ code: 'KWZ-GOLF', name: 'Golf', city: 'Kolwezi' }),
    ).toBe('Golf (Kolwezi)');
    expect(formatZoneDisplayName({ code: 'KWZ-GOLF', name: 'Golf', city: 'Kolwezi' })).toBe(
      'Golf',
    );
  });
});

describe('zone pricing display', () => {
  it('never treats null as free', () => {
    expect(zonePriceKind(null)).toBe('unconfigured');
    expect(formatZonePriceAmount(null, 'CDF').label).toBe('Non configuré');
    expect(zoneNeedsPricing(null, 0)).toBe(true);
  });

  it('treats explicit 0 as free', () => {
    expect(zonePriceKind(0)).toBe('free');
    expect(formatZonePriceAmount(0, 'CDF').label).toBe('Gratuit (0 CDF)');
  });

  it('formats a configured amount', () => {
    expect(formatZonePriceAmount(5000, 'CDF').kind).toBe('priced');
    expect(formatZonePriceAmount(5000, 'CDF').label).toContain('5');
    expect(formatZonePriceAmount(5000, 'CDF').label).toContain('CDF');
  });
});

describe('parsePriceInput', () => {
  it('keeps empty as unconfigured, not zero', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('0')).toBe(0);
    expect(parsePriceInput('1500')).toBe(1500);
  });
});

describe('groupZonesByCity', () => {
  it('keeps multiple zones under one city', () => {
    const groups = groupZonesByCity([
      { city: 'Kolwezi', cityId: 'c1', name: 'Golf' },
      { city: 'Lubumbashi', cityId: 'c2', name: 'Kenya' },
      { city: 'Kolwezi', cityId: 'c1', name: 'Dilala' },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.city).toBe('Kolwezi');
    expect(groups[0]?.zones.map((zone) => zone.name)).toEqual(['Dilala', 'Golf']);
  });
});

describe('zonesForCity', () => {
  it('returns no zones until a city is chosen', () => {
    expect(
      zonesForCity(
        [
          { id: 'z1', cityId: 'c1' },
          { id: 'z2', cityId: 'c2' },
        ],
        '',
      ),
    ).toEqual([]);
  });

  it('cascades zone options to the selected city', () => {
    const zones = [
      { id: 'golf', cityId: 'kwz' },
      { id: 'kenya', cityId: 'lsh' },
      { id: 'dilala', cityId: 'kwz' },
    ];
    expect(zonesForCity(zones, 'kwz').map((zone) => zone.id)).toEqual(['golf', 'dilala']);
  });
});

describe('suggestCityFromAddress', () => {
  const cities = [
    { id: 'kwz', name: 'Kolwezi' },
    { id: 'lsh', name: 'Lubumbashi' },
  ];

  it('may suggest a city from geocoding without assigning a zone', () => {
    expect(suggestCityFromAddress('Avenue Lumumba, Kolwezi', cities)).toBe('kwz');
  });

  it('does not guess when the address is ambiguous', () => {
    expect(suggestCityFromAddress('RD Congo', cities)).toBeNull();
  });
});

describe('formatLockerZoneLabel', () => {
  it('shows neighborhood coverage as Zone (City)', () => {
    expect(
      formatLockerZoneLabel({
        serviceAreaCode: 'KWZ-GOLF',
        serviceAreaName: 'Golf',
        serviceAreaCity: 'Kolwezi',
      }),
    ).toBe('Golf (Kolwezi)');
  });
});
