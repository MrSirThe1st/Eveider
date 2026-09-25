import { fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as { paused?: unknown }).paused !== 'boolean'
    ) {
      return NextResponse.json(fail('Données invalides'), { status: 400 });
    }

    const paused = (body as { paused: boolean }).paused;
    const { accounts } = createRepositories();
    const user = await accounts.setCourierPaused(auth.session.ctx, id, paused);
    return NextResponse.json(
      ok({
        paused: user.isBlocked,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isBlocked: user.isBlocked,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
