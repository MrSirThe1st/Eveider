export const HOLDING_ZONE_CODES = ['KIN', 'LSH', 'KWZ'] as const;

export type HoldingZoneCode = (typeof HOLDING_ZONE_CODES)[number];

export type GeographyZoneRef = {
  id?: string;
  code: string;
  name: string;
  city: string;
  cityId?: string;
};

export function isHoldingZoneCode(code: string | null | undefined): code is HoldingZoneCode {
  return code === 'KIN' || code === 'LSH' || code === 'KWZ';
}

export function isHoldingZone(zone: {
  code?: string | null;
  isHolding?: boolean | null;
}): boolean {
  if (zone.isHolding === true) return true;
  return isHoldingZoneCode(zone.code);
}

/** Display name for a zone. */
export function formatZoneDisplayName(
  zone: Pick<GeographyZoneRef, 'code' | 'name' | 'city'> & { isHolding?: boolean | null },
): string {
  return zone.name;
}

/** Coverage label: “Dilala (Kolwezi)”. Holding zones stay the city name. */
export function formatZoneCoverageLabel(
  zone: Pick<GeographyZoneRef, 'code' | 'name' | 'city'> & { isHolding?: boolean | null },
): string {
  if (isHoldingZone(zone)) return zone.city;
  return `${zone.name} (${zone.city})`;
}

export type ZonePriceKind = 'unconfigured' | 'free' | 'priced';

export function zonePriceKind(amount: number | null | undefined): ZonePriceKind {
  if (amount == null) return 'unconfigured';
  if (amount === 0) return 'free';
  return 'priced';
}

/** `$1,345` in USD, `1 345 Fc` in francs. */
export function formatTariffPickerLabel(
  amount: number | null | undefined,
  currency: 'USD' | 'CDF',
): string {
  if (amount == null) return 'Non configuré';
  if (currency === 'USD') {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `$${formatted}`;
  }
  const formatted = new Intl.NumberFormat('fr-CD', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${formatted} Fc`;
}

/** Collapsed city row: one price when every zone is set, otherwise “Non configuré”. */
export function cityTariffStatusLabel(
  zones: Array<{
    outboundDeliveryAmount: number | null;
    returnDeliveryAmount: number | null;
  }>,
  currency: 'USD' | 'CDF',
): string {
  const amounts = zones.flatMap((zone) => [zone.outboundDeliveryAmount, zone.returnDeliveryAmount]);
  if (amounts.length === 0 || amounts.some((amount) => amount == null)) {
    return 'Non configuré';
  }
  const values = amounts.filter((amount): amount is number => amount != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return formatTariffPickerLabel(min, currency);
  return `${formatTariffPickerLabel(min, currency)} – ${formatTariffPickerLabel(max, currency)}`;
}

export const TARIFF_AMOUNT_MAX = 10_000_000;

const TARIFF_AMOUNT_STEP = {
  USD: 0.5,
  CDF: 50,
} as const;

export function tariffAmountStep(currency: 'USD' | 'CDF'): number {
  return TARIFF_AMOUNT_STEP[currency];
}

/** One press of + or −. Minus from 0 clears a nullable price. */
export function stepTariffAmount(
  amount: number | null | undefined,
  direction: 1 | -1,
  currency: 'USD' | 'CDF',
  nullable = false,
): number | null {
  const step = tariffAmountStep(currency);
  if (amount == null) return direction > 0 ? step : null;
  const raw = amount + direction * step;
  const next = currency === 'USD' ? Math.round(raw * 100) / 100 : Math.round(raw);
  if (next <= 0) {
    if (direction < 0 && amount <= 0) return nullable ? null : 0;
    return 0;
  }
  return Math.min(next, TARIFF_AMOUNT_MAX);
}

export function formatZonePriceAmount(
  amount: number | null | undefined,
  currency: string,
): { kind: ZonePriceKind; label: string } {
  const kind = zonePriceKind(amount);
  if (kind === 'unconfigured') {
    return { kind, label: 'Non configuré' };
  }
  if (kind === 'free') {
    return { kind, label: `Gratuit (0 ${currency})` };
  }
  const formatted = new Intl.NumberFormat('fr-CD', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount ?? 0);
  return { kind, label: `${formatted} ${currency}` };
}

export function zoneNeedsPricing(
  outbound: number | null | undefined,
  inbound: number | null | undefined,
): boolean {
  return outbound == null || inbound == null;
}

export function groupZonesByCity<T extends { city: string; cityId?: string; name: string }>(
  zones: T[],
): Array<{ city: string; cityId: string | null; zones: T[] }> {
  const order: string[] = [];
  const groups = new Map<string, { city: string; cityId: string | null; zones: T[] }>();
  for (const zone of zones) {
    const key = zone.cityId || zone.city;
    const existing = groups.get(key);
    if (existing) {
      existing.zones.push(zone);
      continue;
    }
    order.push(key);
    groups.set(key, {
      city: zone.city,
      cityId: zone.cityId ?? null,
      zones: [zone],
    });
  }
  for (const group of groups.values()) {
    group.zones.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
  return order.map((key) => groups.get(key)!);
}

export function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function zonesForCity<T extends { cityId?: string | null }>(
  zones: T[],
  cityId: string | null | undefined,
): T[] {
  if (!cityId) return [];
  return zones.filter((zone) => zone.cityId === cityId);
}

/**
 * Address/geocode may hint a City. Never used to pick a Zone.
 */
export function suggestCityFromAddress(
  address: string,
  cities: Array<{ id: string; name: string }>,
): string | null {
  const haystack = address.trim().toLowerCase();
  if (!haystack) return null;
  const matches = cities.filter((city) => haystack.includes(city.name.trim().toLowerCase()));
  return matches.length === 1 ? matches[0]!.id : null;
}

export function formatLockerZoneLabel(locker: {
  serviceAreaCode?: string | null;
  serviceAreaName?: string | null;
  serviceAreaCity?: string | null;
}): string {
  if (!locker.serviceAreaName) return '—';
  return formatZoneCoverageLabel({
    code: locker.serviceAreaCode ?? '',
    name: locker.serviceAreaName,
    city: locker.serviceAreaCity ?? locker.serviceAreaName,
  });
}

export const GEOGRAPHY_SETTINGS_HREF = '/tableau-de-bord/parametres/reseau';

export type LockerCreateGeographyBlocker = {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
};

/** A smart locker cannot be created until an active city and zone both exist. */
export function lockerCreateGeographyBlocker(
  cityCount: number,
  zoneCount: number,
): LockerCreateGeographyBlocker | null {
  if (cityCount > 0 && zoneCount > 0) return null;

  if (cityCount === 0) {
    return {
      title: 'Aucune ville',
      description:
        'Un casier doit appartenir à une ville et une zone. Créez d’abord une ville, puis au moins une zone.',
      ctaLabel: 'Créer une ville',
      href: GEOGRAPHY_SETTINGS_HREF,
    };
  }

  return {
    title: 'Aucune zone',
    description:
      'Un casier doit appartenir à une zone. Créez une zone dans une ville existante avant d’ajouter un casier.',
    ctaLabel: 'Créer une zone',
    href: GEOGRAPHY_SETTINGS_HREF,
  };
}
