/** Server-side geocoding fallback when business_locations lack lat/lng. */
export async function geocodeAddressQuery(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', trimmed);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'cd');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };

    if (payload.status !== 'OK' || !payload.results?.[0]?.geometry?.location) {
      return null;
    }

    const { lat, lng } = payload.results[0].geometry.location;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

export function formatLocationQuery(parts: {
  street?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  return [parts.street, parts.city, parts.country].filter(Boolean).join(', ').trim();
}
