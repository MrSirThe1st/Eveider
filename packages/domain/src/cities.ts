export const DRC_CITIES = [
  'Boma',
  'Bukavu',
  'Bunia',
  'Butembo',
  'Gemena',
  'Goma',
  'Isiro',
  'Kalemie',
  'Kananga',
  'Kikwit',
  'Kindu',
  'Kinshasa',
  'Kisangani',
  'Kolwezi',
  'Likasi',
  'Lubumbashi',
  'Matadi',
  'Mbandaka',
  'Mbuji-Mayi',
  'Mwene-Ditu',
  'Tshikapa',
  'Uvira',
] as const;

export type DrcCity = (typeof DRC_CITIES)[number];

export const DRC_CITY_SEEDS: readonly { code: string; name: DrcCity }[] = [
  { code: 'BOM', name: 'Boma' },
  { code: 'BKV', name: 'Bukavu' },
  { code: 'BUN', name: 'Bunia' },
  { code: 'BTB', name: 'Butembo' },
  { code: 'GEM', name: 'Gemena' },
  { code: 'GOM', name: 'Goma' },
  { code: 'ISI', name: 'Isiro' },
  { code: 'KAL', name: 'Kalemie' },
  { code: 'KNG', name: 'Kananga' },
  { code: 'KKW', name: 'Kikwit' },
  { code: 'KND', name: 'Kindu' },
  { code: 'KIN', name: 'Kinshasa' },
  { code: 'KIS', name: 'Kisangani' },
  { code: 'KWZ', name: 'Kolwezi' },
  { code: 'LKS', name: 'Likasi' },
  { code: 'LSH', name: 'Lubumbashi' },
  { code: 'MAT', name: 'Matadi' },
  { code: 'MBA', name: 'Mbandaka' },
  { code: 'MBM', name: 'Mbuji-Mayi' },
  { code: 'MWD', name: 'Mwene-Ditu' },
  { code: 'TSH', name: 'Tshikapa' },
  { code: 'UVI', name: 'Uvira' },
];

export type CityStatus = 'active' | 'archived';

export const CITY_STATUSES: readonly CityStatus[] = ['active', 'archived'] as const;

export function isCityStatus(value: unknown): value is CityStatus {
  return typeof value === 'string' && (CITY_STATUSES as readonly string[]).includes(value);
}

export function isDrcCity(value: unknown): value is DrcCity {
  return typeof value === 'string' && (DRC_CITIES as readonly string[]).includes(value);
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
