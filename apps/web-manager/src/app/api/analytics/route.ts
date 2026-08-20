import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';
import { loadAdminAnalytics } from '@/server/dashboard';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/analytics');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get('days');
  const days = daysParam ? Number.parseInt(daysParam, 10) : 7;

  try {
    const analytics = await perf.measure('db.analytics', () =>
      loadAdminAnalytics(auth.session.ctx, days),
    );

    perf.flush(200);
    return NextResponse.json(ok({ analytics }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
