import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { reverseGeocodeRest } from '@/lib/maps-places-rest';
import { withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      latitude?: number;
      longitude?: number;
    };
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return withMobileCors(
        NextResponse.json(fail('Coordonnées invalides'), { status: 400 }),
      );
    }

    const address = await reverseGeocodeRest(latitude, longitude);
    return withMobileCors(NextResponse.json(ok({ address })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
