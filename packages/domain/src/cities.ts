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
