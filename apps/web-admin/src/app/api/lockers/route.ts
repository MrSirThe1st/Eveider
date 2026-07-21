import { createLockerSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerDetailDto } from '@/lib/locker-presenter';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';
import { listLockers } from '@/server/lockers';

export async function GET() {
  const perf = createRequestTimer('GET /api/lockers');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const lockers = await perf.measure('db.lockers.list', () => listLockers(auth.session.ctx));

    perf.flush(200);
    return NextResponse.json(ok({ lockers }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const perf = createRequestTimer('POST /api/lockers');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createLockerSchema.safeParse(await request.json());
  if (!body.success) {
    perf.flush(400);
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockers } = createRepositories();
    const locker = await perf.measure('db.lockers.create', () =>
      lockers.create(auth.session.ctx, body.data),
    );

    perf.flush(201);
    return NextResponse.json(ok({ locker: toLockerDetailDto(locker) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
