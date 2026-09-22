export const DRC_GEOGRAPHY = [
  { province: 'Kinshasa', cities: ['Kinshasa'] },
  { province: 'Kongo Central', cities: ['Matadi', 'Boma', 'Muanda'] },
  { province: 'Kwango', cities: ['Kenge', 'Popokabaka'] },
  { province: 'Kwilu', cities: ['Bandundu', 'Kikwit', 'Idiofa'] },
  { province: 'Mai-Ndombe', cities: ['Inongo', 'Nioki'] },
  { province: 'Kasaï', cities: ['Tshikapa', 'Luebo'] },
  { province: 'Kasaï-Central', cities: ['Kananga'] },
  { province: 'Kasaï-Oriental', cities: ['Mbuji-Mayi'] },
  { province: 'Lomami', cities: ['Kabinda', 'Mwene-Ditu'] },
  { province: 'Sankuru', cities: ['Lusambo'] },
  { province: 'Équateur', cities: ['Mbandaka'] },
  { province: 'Mongala', cities: ['Lisala', 'Bumba'] },
  { province: 'Nord-Ubangi', cities: ['Gbadolite'] },
  { province: 'Sud-Ubangi', cities: ['Gemena', 'Zongo'] },
  { province: 'Tshuapa', cities: ['Boende'] },
  { province: 'Tshopo', cities: ['Kisangani'] },
  { province: 'Bas-Uélé', cities: ['Buta', 'Bondo'] },
  { province: 'Haut-Uélé', cities: ['Isiro', 'Watsa'] },
  { province: 'Ituri', cities: ['Bunia'] },
  { province: 'Nord-Kivu', cities: ['Goma', 'Beni', 'Butembo'] },
  { province: 'Sud-Kivu', cities: ['Bukavu', 'Uvira'] },
  { province: 'Maniema', cities: ['Kindu'] },
  { province: 'Haut-Katanga', cities: ['Lubumbashi', 'Likasi', 'Kasumbalesa'] },
  { province: 'Haut-Lomami', cities: ['Kamina'] },
  { province: 'Lualaba', cities: ['Kolwezi'] },
  { province: 'Tanganyika', cities: ['Kalemie'] },
] as const;

type GeographyGroup = (typeof DRC_GEOGRAPHY)[number];

export type DrcProvinceName = GeographyGroup['province'];
export type DrcCity = GeographyGroup['cities'][number];

export const DRC_CITIES: readonly DrcCity[] = DRC_GEOGRAPHY.flatMap((group) => [...group.cities]);

const PROVINCE_BY_CITY = new Map<string, DrcProvinceName>(
  DRC_GEOGRAPHY.flatMap((group) => group.cities.map((city) => [city, group.province] as const)),
);

export type CityStatus = 'active' | 'archived';

export const CITY_STATUSES: readonly CityStatus[] = ['active', 'archived'] as const;

export function isCityStatus(value: unknown): value is CityStatus {
  return typeof value === 'string' && (CITY_STATUSES as readonly string[]).includes(value);
}

export function isDrcCity(value: unknown): value is DrcCity {
  return typeof value === 'string' && PROVINCE_BY_CITY.has(value);
}

/** Province for a catalog city. Custom / unknown names have none. */
export function drcCityProvince(name: string): string | null {
  return PROVINCE_BY_CITY.get(name) ?? null;
}

export function matchDrcCity(text: string): DrcCity | null {
  const haystack = text.toLowerCase();
  let match: DrcCity | null = null;
  for (const city of DRC_CITIES) {
    if (haystack.includes(city.toLowerCase()) && (match == null || city.length > match.length)) {
      match = city;
    }
  }
  return match;
}
