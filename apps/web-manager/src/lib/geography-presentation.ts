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

/** Display name for a zone. Holding KIN/LSH/KWZ stay city-wide until Admin reassigns lockers. */
export function formatZoneDisplayName(zone: Pick<GeographyZoneRef, 'code' | 'name' | 'city'>): string {
  if (isHoldingZoneCode(zone.code)) {
    return `${zone.city} — à répartir`;
  }
  return zone.name;
}

/** Coverage label: “Dilala (Kolwezi)” or “Kolwezi — à répartir”. */
export function formatZoneCoverageLabel(
  zone: Pick<GeographyZoneRef, 'code' | 'name' | 'city'>,
): string {
  const display = formatZoneDisplayName(zone);
  if (isHoldingZoneCode(zone.code)) return display;
  return `${display} (${zone.city})`;
}

export type ZonePriceKind = 'unconfigured' | 'free' | 'priced';

export function zonePriceKind(amount: number | null | undefined): ZonePriceKind {
  if (amount == null) return 'unconfigured';
  if (amount === 0) return 'free';
  return 'priced';
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
