import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { searchPlacesRest } from '@/lib/maps-places-rest';
import { withMobileCors } from '@/lib/mobile-session';
import type { MapSearchViewport } from '@/lib/google-maps';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? searchParams.get('query') ?? '';
  const limit = Number.parseInt(searchParams.get('limit') ?? '8', 10);
  const lat = Number.parseFloat(searchParams.get('latitude') ?? '');
  const lng = Number.parseFloat(searchParams.get('longitude') ?? '');
  const zoom = Number.parseFloat(searchParams.get('zoom') ?? '');

  if (query.trim().length < 2) {
    return withMobileCors(NextResponse.json(ok({ places: [] })));
  }

  try {
    let viewport: MapSearchViewport | undefined;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const delta = 0.08;
      viewport = {
        latitude: lat,
        longitude: lng,
        zoom: Number.isFinite(zoom) ? zoom : 14,
        bounds: {
          west: lng - delta,
          south: lat - delta,
          east: lng + delta,
          north: lat + delta,
        },
      };
    }

    const places = await searchPlacesRest(query, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 12) : 8,
      proximity:
        Number.isFinite(lat) && Number.isFinite(lng)
          ? { latitude: lat, longitude: lng }
          : undefined,
      viewport,
    });

    return withMobileCors(NextResponse.json(ok({ places })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
