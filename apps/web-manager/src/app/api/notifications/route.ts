import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal-session';
import { toWebNotificationDto } from '@/lib/web-notification-presenter';

export async function GET(request: Request) {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');

  try {
    const { notifications } = createRepositories();
    const surface = auth.session.kind === 'admin' ? 'admin' : 'organization';
    const [items, unreadCount] = await Promise.all([
      notifications.web.listForUser(auth.session.userId, { limit, offset }),
      notifications.web.unreadCount(auth.session.userId),
    ]);

    return NextResponse.json(
      ok({
        notifications: items.map((item) => toWebNotificationDto(item, surface)),
        unreadCount,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
