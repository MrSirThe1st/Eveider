import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAccountSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const auth = await requireAccountSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { notifications } = createRepositories();
    const pushNotificationsEnabled = await notifications.web.getPushNotificationsEnabled(
      auth.session.ctx.userId!,
    );
    return withMobileCors(NextResponse.json(ok({ pushNotificationsEnabled })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAccountSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const body = (await request.json()) as { pushNotificationsEnabled?: unknown };
    if (typeof body.pushNotificationsEnabled !== 'boolean') {
      return withMobileCors(
        NextResponse.json(fail('pushNotificationsEnabled requis'), { status: 400 }),
      );
    }

    const { notifications } = createRepositories();
    const pushNotificationsEnabled = await notifications.web.setPushNotificationsEnabled(
      auth.session.ctx.userId!,
      body.pushNotificationsEnabled,
    );
    return withMobileCors(NextResponse.json(ok({ pushNotificationsEnabled })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
