import { fail, ok } from '@eveider/api-contracts';
import { createRepositories, isValidExpoPushToken } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAccountSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const auth = await requireAccountSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const body = (await request.json()) as {
      expoPushToken?: unknown;
      platform?: unknown;
      deviceId?: unknown;
    };

    const expoPushToken =
      typeof body.expoPushToken === 'string' ? body.expoPushToken.trim() : '';
    const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
    const deviceId =
      typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : null;

    if (!isValidExpoPushToken(expoPushToken) || !platform) {
      return withMobileCors(
        NextResponse.json(fail('expoPushToken et platform (ios|android) requis'), {
          status: 400,
        }),
      );
    }

    const { notifications } = createRepositories();
    const device = await notifications.web.push.registerDevice({
      userId: auth.session.ctx.userId!,
      expoPushToken,
      platform,
      deviceId,
    });

    return withMobileCors(
      NextResponse.json(
        ok({
          device: {
            id: device.id,
            platform: device.platform,
            enabled: device.enabled,
            lastSeenAt: device.lastSeenAt.toISOString(),
          },
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAccountSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      expoPushToken?: unknown;
      deviceId?: unknown;
    };
    const expoPushToken =
      typeof body.expoPushToken === 'string' ? body.expoPushToken.trim() : null;
    const deviceId =
      typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : null;

    const { notifications } = createRepositories();
    const updated = await notifications.web.push.unregisterDevice({
      userId: auth.session.ctx.userId!,
      expoPushToken,
      deviceId,
    });

    return withMobileCors(NextResponse.json(ok({ updated })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
