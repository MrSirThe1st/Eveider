import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { withMobileCors } from '@/lib/mobile-session';
import { listCityOptions } from '@/server/cities';

function json(body: unknown, init?: { status?: number }) {
  return withMobileCors(NextResponse.json(body, init));
}

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

/** Active operating cities. Public so the mobile app can show real coverage. */
export async function GET() {
  try {
    const cities = await listCityOptions();
    return json(
      ok({
        cities: cities.map((city) => ({ id: city.id, name: city.name })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return json(fail(message), { status: 500 });
  }
}
