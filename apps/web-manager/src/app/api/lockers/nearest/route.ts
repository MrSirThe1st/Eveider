import { fail, nearestLockersQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerMapMarkerDto } from '@/lib/locker-presenter';
import { withMobileCors } from '@/lib/mobile-session';

function json(body: unknown, init?: { status?: number }) {
  return withMobileCors(NextResponse.json(body, init));
}

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = nearestLockersQuerySchema.safeParse({
    latitude: searchParams.get('latitude'),
    longitude: searchParams.get('longitude'),
    limit: searchParams.get('limit') ?? undefined,
    selectableOnly: searchParams.get('selectableOnly') ?? undefined,
  });

  if (!query.success) {
    return json(fail('Coordonnées invalides'), { status: 400 });
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listNearest(
      { latitude: query.data.latitude, longitude: query.data.longitude },
      {
        limit: query.data.limit,
        selectableOnly: query.data.selectableOnly ?? true,
      },
    );

    const markers = items
      .map(toLockerMapMarkerDto)
      .filter((marker): marker is NonNullable<typeof marker> => marker != null);

    return json(ok({ lockers: markers }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return json(fail(message), { status: 500 });
  }
}
