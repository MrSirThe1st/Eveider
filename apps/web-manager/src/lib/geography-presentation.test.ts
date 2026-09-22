import { describe, expect, it } from 'vitest';
import {
  cityTariffStatusLabel,
  formatLockerZoneLabel,
  formatTariffPickerLabel,
  formatZoneCoverageLabel,
  formatZoneDisplayName,
  formatZonePriceAmount,
  stepTariffAmount,
  GEOGRAPHY_SETTINGS_HREF,
  groupZonesByCity,
  isHoldingZoneCode,
  lockerCreateGeographyBlocker,
  parsePriceInput,
  suggestCityFromAddress,
  zoneNeedsPricing,
  zonePriceKind,
  zonesForCity,
} from './geography-presentation';

describe('holding zone labels', () => {
  it('uses the city name for holding zones, without à répartir', () => {
    expect(isHoldingZoneCode('KWZ')).toBe(true);
    expect(
      formatZoneDisplayName({ code: 'KWZ', name: 'Kolwezi', city: 'Kolwezi' }),
    ).toBe('Kolwezi');
    expect(
      formatZoneDisplayName({ code: 'EVZABC123', name: 'Goma', city: 'Goma', isHolding: true }),
    ).toBe('Goma');
    expect(
      formatZoneCoverageLabel({ code: 'LSH', name: 'Lubumbashi', city: 'Lubumbashi' }),
    ).toBe('Lubumbashi');
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

describe('tariff price picker', () => {
  it('shows $ or Fc for the platform currency', () => {
    expect(formatTariffPickerLabel(1345, 'USD')).toBe('$1,345');
    expect(formatTariffPickerLabel(12.5, 'USD')).toBe('$12.50');
    expect(formatTariffPickerLabel(0, 'USD')).toBe('$0');
    expect(formatTariffPickerLabel(1345, 'CDF').replace(/\s/g, ' ')).toBe('1 345 Fc');
    expect(formatTariffPickerLabel(0, 'CDF')).toBe('0 Fc');
    expect(formatTariffPickerLabel(null, 'CDF')).toBe('Non configuré');
  });

  it('shows Non configuré until every zone price is set', () => {
    const zones = [
      { outboundDeliveryAmount: null, returnDeliveryAmount: null },
      { outboundDeliveryAmount: 500, returnDeliveryAmount: null },
    ];
    expect(cityTariffStatusLabel(zones, 'CDF')).toBe('Non configuré');
    expect(
      cityTariffStatusLabel(
        [{ outboundDeliveryAmount: 500, returnDeliveryAmount: 500 }],
        'CDF',
      ).replace(/\s/g, ' '),
    ).toBe('500 Fc');
    expect(
      cityTariffStatusLabel(
        [{ outboundDeliveryAmount: 1500, returnDeliveryAmount: 0 }],
        'USD',
      ),
    ).toBe('$0 – $1,500');
  });

  it('steps by 50 Fc or $0.50, and minus from zero clears a nullable price', () => {
    expect(stepTariffAmount(null, 1, 'CDF')).toBe(50);
    expect(stepTariffAmount(null, -1, 'CDF', true)).toBeNull();
    expect(stepTariffAmount(500, 1, 'CDF')).toBe(550);
    expect(stepTariffAmount(50, -1, 'CDF')).toBe(0);
    expect(stepTariffAmount(0, -1, 'CDF', true)).toBeNull();
    expect(stepTariffAmount(0, -1, 'CDF', false)).toBe(0);
    expect(stepTariffAmount(12.5, 1, 'USD')).toBe(13);
    expect(stepTariffAmount(0, 1, 'USD')).toBe(0.5);
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

describe('lockerCreateGeographyBlocker', () => {
  it('allows create when an active city and zone exist', () => {
    expect(lockerCreateGeographyBlocker(1, 1)).toBeNull();
  });

  it('asks for a city first when none exist', () => {
    const blocker = lockerCreateGeographyBlocker(0, 0);
    expect(blocker?.title).toBe('Aucune ville');
    expect(blocker?.ctaLabel).toBe('Créer une ville');
    expect(blocker?.href).toBe(GEOGRAPHY_SETTINGS_HREF);
    expect(blocker?.description).toContain('ville');
    expect(blocker?.description).toContain('zone');
  });

  it('asks for a zone when cities exist without zones', () => {
    const blocker = lockerCreateGeographyBlocker(2, 0);
    expect(blocker?.title).toBe('Aucune zone');
    expect(blocker?.ctaLabel).toBe('Créer une zone');
    expect(blocker?.href).toBe(GEOGRAPHY_SETTINGS_HREF);
    expect(blocker?.description).toContain('zone');
  });
});
