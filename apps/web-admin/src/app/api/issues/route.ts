import { fail, listIssuesQuerySchema, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';
import { listIssues } from '@/server/issues';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/issues');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listIssuesQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
  });

  if (!query.success) {
    perf.flush(400);
    return NextResponse.json(fail('Filtre de statut invalide'), { status: 400 });
  }

  try {
    const issues = await perf.measure('db.issues.list', () =>
      listIssues(
        auth.session.ctx,
        query.data.status ? { status: query.data.status } : undefined,
      ),
    );

    perf.flush(200);
    return NextResponse.json(ok({ issues }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
