import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';
import { listBusinesses } from '@/server/businesses';

export async function GET() {
  const perf = createRequestTimer('GET /api/businesses');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const businesses = await perf.measure('db.businesses.list', () =>
      listBusinesses(auth.session.ctx),
    );

    perf.flush(200);
    return NextResponse.json(ok({ businesses }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
