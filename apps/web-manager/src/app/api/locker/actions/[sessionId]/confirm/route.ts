import { fail, lockerActionConfirmSchema, ok } from '@eveider/api-contracts';
import {
  createRepositories,
  LockerAuthorizationError,
} from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerApi } from '@/lib/locker-api-session';

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = requireLockerApi(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { sessionId } = await context.params;
  if (!sessionId?.trim()) {
    return NextResponse.json(fail('SESSION_NOT_FOUND'), { status: 404 });
  }

  const body = lockerActionConfirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockerActions } = createRepositories();
    const result = await lockerActions.confirm(auth.lockerId, sessionId, body.data);
    return NextResponse.json(
      ok({
        confirmed: true,
        alreadyConfirmed: result.alreadyConfirmed,
        sessionId: result.sessionId,
        action: result.action,
      }),
    );
  } catch (err) {
    if (err instanceof LockerAuthorizationError) {
      const status = err.code === 'SESSION_NOT_FOUND' ? 404 : 403;
      return NextResponse.json({ success: false, error: err.code, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
