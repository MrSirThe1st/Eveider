import { haversineDistanceKm, KINSHASA_CENTER } from '@eveider/domain';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

/** Approximate geographic bounds of the Democratic Republic of the Congo. */
export const DRC_BOUNDS = {
  west: 12.04,
  south: -13.46,
  east: 31.31,
  north: 5.39,
} as const;

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapSearchViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
  bounds: MapBounds;
};

/** Google Maps LatLngBoundsLiteral-compatible restriction. */
export const DRC_MAP_RESTRICTION = {
  latLngBounds: {
    west: DRC_BOUNDS.west,
    south: DRC_BOUNDS.south,
    east: DRC_BOUNDS.east,
    north: DRC_BOUNDS.north,
  },
  strictBounds: false,
} as const;

export function getGoogleMapsApiKey(): string {
  // Must be a static `process.env.NEXT_PUBLIC_*` access so Next can inline it for the browser.
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY manquant. Ajoutez votre clé Google Maps dans .env (racine du monorepo), puis redémarrez pnpm dev.',
    );
  }
  return key.trim();
}

export function getDefaultMapCenter() {
  return KINSHASA_CENTER;
}

export const LOCKER_PIN_COLORS = {
  available: '#09D40B',
  low: '#FFB74D',
  full: '#94A3B8',
  offline: '#64748B',
  selected: '#FFFFFF',
  destination: '#3B82F6',
} as const;

export function lockerPinColor(availableCompartments: number, status: string): string {
  if (status !== 'active') return LOCKER_PIN_COLORS.offline;
  if (availableCompartments === 0) return LOCKER_PIN_COLORS.full;
  if (availableCompartments <= 1) return LOCKER_PIN_COLORS.low;
  return LOCKER_PIN_COLORS.available;
}

export type MapPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  placeType: string;
  placeTypeLabel: string;
};

const PLACE_TYPE_RANK: Record<string, number> = {
  street_address: 0,
  premise: 0,
  subpremise: 0,
  route: 1,
  point_of_interest: 1,
  neighborhood: 2,
  sublocality: 2,
  sublocality_level_1: 3,
  locality: 4,
  administrative_area_level_2: 5,
  administrative_area_level_1: 6,
  country: 7,
};

const PLACE_TYPE_LABELS: Record<string, string> = {
  street_address: 'Adresse',
  premise: 'Adresse',
  route: 'Rue',
  point_of_interest: 'Point d’intérêt',
  neighborhood: 'Quartier',
  sublocality: 'Quartier',
  sublocality_level_1: 'Commune',
  locality: 'Ville',
  administrative_area_level_2: 'Territoire',
  administrative_area_level_1: 'Province',
  country: 'Pays',
};

let mapsConfigured = false;

function ensureGoogleMapsConfigured() {
  if (mapsConfigured) return;
  setOptions({
    key: getGoogleMapsApiKey(),
    v: 'weekly',
  });
  mapsConfigured = true;
}

export function getPrimaryPlaceType(types: string[] | undefined): string {
  if (!types?.length) return 'locality';
  const ranked = [...types].sort(
    (a, b) => (PLACE_TYPE_RANK[a] ?? 5) - (PLACE_TYPE_RANK[b] ?? 5),
  );
  return ranked[0] ?? 'locality';
}

export function rankPlaceType(placeType: string): number {
  return PLACE_TYPE_RANK[placeType] ?? 5;
}

export function placeTypeLabel(placeType: string): string {
  return PLACE_TYPE_LABELS[placeType] ?? 'Lieu';
}

export function zoomForPlaceType(placeType: string): number {
  switch (placeType) {
    case 'street_address':
    case 'premise':
    case 'subpremise':
      return 17;
    case 'route':
    case 'point_of_interest':
      return 16;
    case 'neighborhood':
    case 'sublocality':
    case 'sublocality_level_1':
      return 15;
    case 'locality':
      return 14;
    default:
      return 13;
  }
}

function toMapPlace(
  placeId: string,
  label: string,
  latitude: number,
  longitude: number,
  types?: string[],
): MapPlace {
  const placeType = getPrimaryPlaceType(types);
  return {
    id: placeId,
    label,
    latitude,
    longitude,
    placeType,
    placeTypeLabel: placeTypeLabel(placeType),
  };
}

/**
 * Place search via Maps JavaScript Places library (works with HTTP-referrer API keys).
 * Do not call Geocoding/Places REST with a referrer-restricted key.
 */
export async function searchGooglePlaces(
  query: string,
  options?: {
    proximity?: { latitude: number; longitude: number };
    viewport?: MapSearchViewport;
    limit?: number;
  },
): Promise<MapPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? 8;
  ensureGoogleMapsConfigured();

  const { AutocompleteSessionToken, AutocompleteSuggestion } = (await importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;

  const token = new AutocompleteSessionToken();
  const locationBias = options?.proximity
    ? {
        center: {
          lat: options.proximity.latitude,
          lng: options.proximity.longitude,
        },
        radius: 25_000,
      }
    : options?.viewport
      ? {
          west: options.viewport.bounds.west,
          south: options.viewport.bounds.south,
          east: options.viewport.bounds.east,
          north: options.viewport.bounds.north,
        }
      : {
          west: DRC_BOUNDS.west,
          south: DRC_BOUNDS.south,
          east: DRC_BOUNDS.east,
          north: DRC_BOUNDS.north,
        };

  const { suggestions } =
    await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: token,
      includedRegionCodes: ['cd'],
      language: 'fr',
      locationBias,
    });

  const places: MapPlace[] = [];

  for (const suggestion of suggestions.slice(0, limit)) {
    const prediction = suggestion.placePrediction;
    if (!prediction) continue;

    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'formattedAddress', 'location', 'types', 'displayName'],
    });

    const location = place.location;
    if (!location) continue;

    places.push(
      toMapPlace(
        place.id ?? prediction.placeId,
        place.formattedAddress ?? place.displayName ?? prediction.text?.text ?? trimmed,
        location.lat(),
        location.lng(),
        place.types,
      ),
    );
  }

  return places;
}

/**
 * Reverse geocode via Maps JS Geocoder (referrer-restricted keys OK).
 * Returns a French formatted address when available.
 */
export async function reverseGeocodeGoogle(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  ensureGoogleMapsConfigured();
  const { Geocoder } = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
  const geocoder = new Geocoder();

  const response = await geocoder.geocode({
    location: { lat: latitude, lng: longitude },
    language: 'fr',
    region: 'cd',
  });

  const result = response.results[0];
  return result?.formatted_address ?? null;
}

export function parseCoordinateInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

export function isWithinDrcBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= DRC_BOUNDS.south &&
    latitude <= DRC_BOUNDS.north &&
    longitude >= DRC_BOUNDS.west &&
    longitude <= DRC_BOUNDS.east
  );
}

/** @deprecated Prefer searchGooglePlaces — kept for gradual call-site updates. */
export const searchMapboxPlaces = searchGooglePlaces;
/** @deprecated Prefer MapPlace */
export type MapboxPlace = MapPlace;
