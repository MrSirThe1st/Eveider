import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal-session';

export async function PATCH() {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { notifications } = createRepositories();
    const updated = await notifications.web.markAllRead(auth.session.userId);
    return NextResponse.json(ok({ updated }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
