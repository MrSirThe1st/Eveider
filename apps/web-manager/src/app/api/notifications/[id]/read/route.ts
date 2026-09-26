import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal-session';
import { toWebNotificationDto } from '@/lib/web-notification-presenter';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const { notifications } = createRepositories();
    const surface = auth.session.kind === 'admin' ? 'admin' : 'organization';
    const updated = await notifications.web.markRead(auth.session.userId, id);
    return NextResponse.json(ok({ notification: toWebNotificationDto(updated, surface) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
