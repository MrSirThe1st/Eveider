import { fail, lockersByCityQuerySchema, ok } from '@eveider/api-contracts';
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
  const query = lockersByCityQuerySchema.safeParse({
    city: searchParams.get('city') ?? undefined,
  });

  if (!query.success) {
    return json(fail('Ville invalide'), { status: 400 });
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listByCity(query.data.city);
    const markers = items
      .map(toLockerMapMarkerDto)
      .filter((marker): marker is NonNullable<typeof marker> => marker != null);

    return json(ok({ lockers: markers }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return json(fail(message), { status: 500 });
  }
}
