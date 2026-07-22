import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toNotificationDto } from '@/lib/notification-presenter';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { notifications } = createRepositories();
    const [items, unreadCount] = await Promise.all([
      notifications.listForCustomer(auth.session.ctx),
      notifications.unreadCount(auth.session.ctx),
    ]);

    return withMobileCors(
      NextResponse.json(
        ok({
          notifications: items.map(toNotificationDto),
          unreadCount,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
