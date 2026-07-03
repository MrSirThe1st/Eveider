import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerMapMarkerDto } from '@/lib/locker-presenter';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { searchParams } = new URL(request.url);
  const latitude = Number.parseFloat(searchParams.get('latitude') ?? '');
  const longitude = Number.parseFloat(searchParams.get('longitude') ?? '');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return withMobileCors(NextResponse.json(fail('Coordonnées invalides'), { status: 400 }));
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listNearest(
      { latitude, longitude },
      { limit: 20, selectableOnly: true },
    );

    const markers = items
      .map(toLockerMapMarkerDto)
      .filter((marker): marker is NonNullable<typeof marker> => marker != null);

    return withMobileCors(NextResponse.json(ok({ lockers: markers })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
