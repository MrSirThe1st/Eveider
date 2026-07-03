import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toNotificationDto } from '@/lib/notification-presenter';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await context.params;

  try {
    const { notifications } = createRepositories();
    const notification = await notifications.markRead(auth.session.ctx, id);

    return withMobileCors(
      NextResponse.json(ok({ notification: toNotificationDto(notification) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('périmètre') ? 403 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
