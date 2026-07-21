import { fail, listParcelsQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { toAdminParcelDto } from '@/lib/parcel-presenter';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/parcels');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listParcelsQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
  });

  if (!query.success) {
    perf.flush(400);
    return NextResponse.json(fail('Filtre de statut invalide'), { status: 400 });
  }

  try {
    const { parcels } = createRepositories();
    const items = await perf.measure('db.parcels.list', () =>
      parcels.listAll(
        auth.session.ctx,
        query.data.status ? { status: query.data.status } : undefined,
      ),
    );

    perf.flush(200);
    return NextResponse.json(ok({ parcels: items.map(toAdminParcelDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
