import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';
import { loadAdminDashboard } from '@/server/dashboard';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/dashboard');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get('days');
  const days = daysParam ? Number.parseInt(daysParam, 10) : 7;

  try {
    const data = await perf.measure('db.dashboard', () =>
      loadAdminDashboard(auth.session.ctx, days),
    );

    perf.flush(200);
    return NextResponse.json(ok(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
