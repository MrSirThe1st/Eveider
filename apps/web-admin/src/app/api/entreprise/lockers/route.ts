import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function GET() {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listActiveWithAvailability();

    return NextResponse.json(
      ok({
        lockers: items.map((locker) => ({
          id: locker.id,
          name: locker.name,
          address: locker.address,
          availableCompartments: locker.availableCompartments,
          availableBySize: locker.availableBySize,
          rows: locker.rows,
          columns: locker.columns,
          latitude: locker.latitude,
          longitude: locker.longitude,
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
