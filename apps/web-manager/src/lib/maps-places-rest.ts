import {
  DRC_BOUNDS,
  getPrimaryPlaceType,
  normalizeFormattedAddress,
  placeTypeLabel,
  type MapPlace,
  type MapSearchViewport,
} from '@/lib/google-maps';

function getServerMapsApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key?.trim()) {
    throw new Error('Clé Google Maps manquante (GOOGLE_MAPS_API_KEY).');
  }
  return key.trim();
}

type AutocompletePrediction = {
  place_id?: string;
  description?: string;
  types?: string[];
};

type PlaceDetailsResult = {
  place_id?: string;
  formatted_address?: string;
  name?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  types?: string[];
};

/**
 * Server-side Places Autocomplete + Details (IP-restricted keys OK).
 * Used by mobile — browser continues to use searchGooglePlaces (JS SDK).
 */
export async function searchPlacesRest(
  query: string,
  options?: {
    proximity?: { latitude: number; longitude: number };
    viewport?: MapSearchViewport;
    limit?: number;
  },
): Promise<MapPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = getServerMapsApiKey();
  const limit = options?.limit ?? 8;

  const autocompleteUrl = new URL(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  );
  autocompleteUrl.searchParams.set('input', trimmed);
  autocompleteUrl.searchParams.set('key', apiKey);
  autocompleteUrl.searchParams.set('language', 'fr');
  autocompleteUrl.searchParams.set('components', 'country:cd');

  if (options?.proximity) {
    autocompleteUrl.searchParams.set(
      'location',
      `${options.proximity.latitude},${options.proximity.longitude}`,
    );
    autocompleteUrl.searchParams.set('radius', '25000');
  } else if (options?.viewport) {
    autocompleteUrl.searchParams.set(
      'location',
      `${options.viewport.latitude},${options.viewport.longitude}`,
    );
    autocompleteUrl.searchParams.set('radius', '40000');
  } else {
    const midLat = (DRC_BOUNDS.south + DRC_BOUNDS.north) / 2;
    const midLng = (DRC_BOUNDS.west + DRC_BOUNDS.east) / 2;
    autocompleteUrl.searchParams.set('location', `${midLat},${midLng}`);
    autocompleteUrl.searchParams.set('radius', '500000');
  }

  const autocompleteResponse = await fetch(autocompleteUrl.toString());
  if (!autocompleteResponse.ok) {
    throw new Error('Recherche Places impossible');
  }

  const autocompletePayload = (await autocompleteResponse.json()) as {
    status?: string;
    predictions?: AutocompletePrediction[];
    error_message?: string;
  };

  if (
    autocompletePayload.status !== 'OK' &&
    autocompletePayload.status !== 'ZERO_RESULTS'
  ) {
    throw new Error(
      autocompletePayload.error_message ??
        `Places autocomplete: ${autocompletePayload.status ?? 'erreur'}`,
    );
  }

  const predictions = (autocompletePayload.predictions ?? []).slice(0, limit);
  const places: MapPlace[] = [];

  for (const prediction of predictions) {
    if (!prediction.place_id) continue;

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', prediction.place_id);
    detailsUrl.searchParams.set('key', apiKey);
    detailsUrl.searchParams.set('language', 'fr');
    detailsUrl.searchParams.set('fields', 'place_id,formatted_address,name,geometry,types');

    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) continue;

    const detailsPayload = (await detailsResponse.json()) as {
      status?: string;
      result?: PlaceDetailsResult;
    };
    if (detailsPayload.status !== 'OK' || !detailsPayload.result?.geometry?.location) {
      continue;
    }

    const { lat, lng } = detailsPayload.result.geometry.location;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const types = detailsPayload.result.types ?? prediction.types;
    const placeType = getPrimaryPlaceType(types);
    places.push({
      id: detailsPayload.result.place_id ?? prediction.place_id,
      label: normalizeFormattedAddress(
        detailsPayload.result.formatted_address ??
          prediction.description ??
          detailsPayload.result.name ??
          trimmed,
      ),
      latitude: lat,
      longitude: lng,
      placeType,
      placeTypeLabel: placeTypeLabel(placeType),
    });
  }

  return places;
}

export async function reverseGeocodeRest(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const apiKey = getServerMapsApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'fr');
  url.searchParams.set('region', 'cd');

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{ formatted_address?: string }>;
  };

  if (payload.status !== 'OK' || !payload.results?.[0]?.formatted_address) {
    return null;
  }

  return normalizeFormattedAddress(payload.results[0].formatted_address);
}
