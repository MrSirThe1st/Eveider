import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal-session';

/** Lightweight poll endpoint for bell unread count + operational badges. */
export async function GET() {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { notifications } = createRepositories();
    const unreadCount = await notifications.web.unreadCount(auth.session.userId);

    if (auth.session.kind === 'admin') {
      const badges = await notifications.web.getAdminOperationalBadges();
      return NextResponse.json(ok({ unreadCount, badges: { admin: badges } }));
    }

    const badges = await notifications.web.getBusinessOperationalBadges(auth.session.businessId);
    return NextResponse.json(ok({ unreadCount, badges: { business: badges } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
