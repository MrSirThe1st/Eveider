import { fail, ok, updateLockerSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerDetailDto } from '@/lib/locker-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { lockers } = createRepositories();
    const locker = await lockers.findById(auth.session.ctx, id);

    if (!locker) {
      return NextResponse.json(fail('Casier introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ locker: toLockerDetailDto(locker) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const body = updateLockerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockers } = createRepositories();
    await lockers.update(auth.session.ctx, id, body.data);
    const locker = await lockers.findById(auth.session.ctx, id);

    if (!locker) {
      return NextResponse.json(fail('Casier introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ locker: toLockerDetailDto(locker) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
