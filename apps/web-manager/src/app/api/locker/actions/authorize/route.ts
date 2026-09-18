import {
  fail,
  lockerActionAuthorizeSchema,
  ok,
} from '@eveider/api-contracts';
import {
  createRepositories,
  LockerAuthorizationError,
} from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerApi } from '@/lib/locker-api-session';

export async function POST(request: Request) {
  const auth = requireLockerApi(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = lockerActionAuthorizeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockerActions } = createRepositories();
    const result = await lockerActions.authorize(auth.lockerId, body.data);
    return NextResponse.json(
      ok({
        authorized: true,
        sessionId: result.sessionId,
        action: result.action,
        trackingNumber: result.trackingNumber,
        expiresAt: result.expiresAt.toISOString(),
        compartment: result.compartment,
      }),
    );
  } catch (err) {
    if (err instanceof LockerAuthorizationError) {
      const status = err.code === 'PARCEL_NOT_FOUND' ? 404 : err.code === 'SESSION_CONFLICT' ? 409 : 403;
      return NextResponse.json({ success: false, error: err.code, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
