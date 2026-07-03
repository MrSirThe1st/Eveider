import { createLockerSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerDetailDto, toLockerSummaryDto } from '@/lib/locker-presenter';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listAll(auth.session.ctx);

    return NextResponse.json(ok({ lockers: items.map(toLockerSummaryDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createLockerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockers } = createRepositories();
    const locker = await lockers.create(auth.session.ctx, body.data);

    return NextResponse.json(ok({ locker: toLockerDetailDto(locker) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
