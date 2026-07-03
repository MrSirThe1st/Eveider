import { haversineDistanceKm, KINSHASA_CENTER } from '@eveider/domain';

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

/** Mapbox maxBounds format: [[west, south], [east, north]] */
export const DRC_MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [DRC_BOUNDS.west, DRC_BOUNDS.south],
  [DRC_BOUNDS.east, DRC_BOUNDS.north],
];

export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN manquant. Ajoutez votre jeton Mapbox dans .env',
    );
  }
  return token;
}

export function getDefaultMapCenter() {
  return KINSHASA_CENTER;
}

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

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

export type MapboxPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  placeType: string;
  placeTypeLabel: string;
};

type MapboxGeocodeFeature = {
  id: string;
  place_name: string;
  text?: string;
  center: [number, number];
  place_type?: string[];
};

type MapboxGeocodeResponse = {
  features: MapboxGeocodeFeature[];
};

const PLACE_TYPE_RANK: Record<string, number> = {
  address: 0,
  poi: 1,
  neighborhood: 2,
  district: 3,
  locality: 4,
  place: 5,
  region: 6,
  country: 7,
};

const PLACE_TYPE_LABELS: Record<string, string> = {
  address: 'Adresse',
  poi: 'Point d’intérêt',
  neighborhood: 'Quartier',
  district: 'Commune',
  locality: 'Localité',
  place: 'Ville',
  region: 'Province',
  country: 'Pays',
};

const PRECISE_SEARCH_TYPES = 'address,poi,neighborhood,district';
const BROAD_SEARCH_TYPES = 'address,poi,neighborhood,locality,district,place';

export function getPrimaryPlaceType(feature: MapboxGeocodeFeature): string {
  return feature.place_type?.[0] ?? 'place';
}

export function rankPlaceType(placeType: string): number {
  return PLACE_TYPE_RANK[placeType] ?? 5;
}

export function placeTypeLabel(placeType: string): string {
  return PLACE_TYPE_LABELS[placeType] ?? 'Lieu';
}

export function zoomForPlaceType(placeType: string): number {
  switch (placeType) {
    case 'address':
      return 17;
    case 'poi':
      return 16;
    case 'neighborhood':
    case 'district':
      return 15;
    case 'locality':
      return 14;
    default:
      return 13;
  }
}

function toMapboxPlace(feature: MapboxGeocodeFeature): MapboxPlace {
  const placeType = getPrimaryPlaceType(feature);
  return {
    id: feature.id,
    label: feature.place_name,
    longitude: feature.center[0],
    latitude: feature.center[1],
    placeType,
    placeTypeLabel: placeTypeLabel(placeType),
  };
}

function sortFeaturesByPrecision(features: MapboxGeocodeFeature[]): MapboxGeocodeFeature[] {
  return [...features].sort(
    (a, b) => rankPlaceType(getPrimaryPlaceType(a)) - rankPlaceType(getPrimaryPlaceType(b)),
  );
}

function sortFeaturesByViewport(
  features: MapboxGeocodeFeature[],
  proximity: { latitude: number; longitude: number },
  preferNearby: boolean,
): MapboxGeocodeFeature[] {
  const distanceKm = (feature: MapboxGeocodeFeature) =>
    haversineDistanceKm(proximity, {
      latitude: feature.center[1],
      longitude: feature.center[0],
    });

  return [...features].sort((a, b) => {
    if (preferNearby) {
      const distanceDiff = distanceKm(a) - distanceKm(b);
      if (Math.abs(distanceDiff) > 2) return distanceDiff;
    }

    const typeDiff = rankPlaceType(getPrimaryPlaceType(a)) - rankPlaceType(getPrimaryPlaceType(b));
    if (typeDiff !== 0) return typeDiff;

    return distanceKm(a) - distanceKm(b);
  });
}

function dedupeFeatures(features: MapboxGeocodeFeature[]): MapboxGeocodeFeature[] {
  const seen = new Set<string>();
  return features.filter((feature) => {
    if (seen.has(feature.id)) return false;
    seen.add(feature.id);
    return true;
  });
}

function clampBoundsToDrc(bounds: MapBounds): MapBounds {
  return {
    west: Math.max(bounds.west, DRC_BOUNDS.west),
    south: Math.max(bounds.south, DRC_BOUNDS.south),
    east: Math.min(bounds.east, DRC_BOUNDS.east),
    north: Math.min(bounds.north, DRC_BOUNDS.north),
  };
}

function searchBoundsForViewport(viewport?: MapSearchViewport): MapBounds {
  if (!viewport || viewport.zoom < 11) return DRC_BOUNDS;
  return clampBoundsToDrc(viewport.bounds);
}

async function reverseGeocodeLocality(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const token = getMapboxToken();
  const params = new URLSearchParams({
    access_token: token,
    language: 'fr',
    types: 'place,locality,district,neighborhood',
    limit: '1',
  });

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = (await response.json()) as MapboxGeocodeResponse;
  const feature = data.features[0];
  if (!feature) return null;

  const locality =
    feature.text ??
    feature.place_name
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.length > 0);

  return locality ?? null;
}

async function fetchGeocodeFeatures(
  query: string,
  options: {
    types: string;
    limit: number;
    proximity?: { latitude: number; longitude: number };
    bounds?: MapBounds;
  },
): Promise<MapboxGeocodeFeature[]> {
  const token = getMapboxToken();
  const bounds = options.bounds ?? DRC_BOUNDS;
  const params = new URLSearchParams({
    access_token: token,
    country: 'cd',
    limit: String(options.limit),
    language: 'fr',
    types: options.types,
    autocomplete: 'true',
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
  });

  if (options.proximity) {
    params.set('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Recherche d’adresse impossible.');
  }

  const data = (await response.json()) as MapboxGeocodeResponse;
  return data.features;
}

export async function searchMapboxPlaces(
  query: string,
  options?: {
    proximity?: { latitude: number; longitude: number };
    viewport?: MapSearchViewport;
    limit?: number;
  },
): Promise<MapboxPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? 8;
  const proximity =
    options?.proximity ??
    (options?.viewport
      ? { latitude: options.viewport.latitude, longitude: options.viewport.longitude }
      : undefined);
  const bounds = searchBoundsForViewport(options?.viewport);
  const preferNearby = (options?.viewport?.zoom ?? 0) >= 12;
  const fetchLimit = Math.max(limit, 10);

  const queries = [trimmed];
  if (options?.viewport && options.viewport.zoom >= 12) {
    const locality = await reverseGeocodeLocality(
      options.viewport.latitude,
      options.viewport.longitude,
    );
    if (locality && !trimmed.toLowerCase().includes(locality.toLowerCase())) {
      queries.push(`${trimmed} ${locality}`);
    }
  }

  let features: MapboxGeocodeFeature[] = [];

  for (const searchQuery of queries) {
    const preciseFeatures = await fetchGeocodeFeatures(searchQuery, {
      types: PRECISE_SEARCH_TYPES,
      limit: fetchLimit,
      proximity,
      bounds,
    });
    features = dedupeFeatures([...features, ...preciseFeatures]);
  }

  if (features.length === 0) {
    for (const searchQuery of queries) {
      const broaderFeatures = await fetchGeocodeFeatures(searchQuery, {
        types: BROAD_SEARCH_TYPES,
        limit: fetchLimit,
        proximity,
        bounds,
      });
      features = dedupeFeatures([
        ...features,
        ...broaderFeatures.filter((feature) => rankPlaceType(getPrimaryPlaceType(feature)) <= 5),
      ]);
    }
  }

  const sorted = proximity
    ? sortFeaturesByViewport(features, proximity, preferNearby)
    : sortFeaturesByPrecision(features);

  return sorted.slice(0, limit).map(toMapboxPlace);
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
