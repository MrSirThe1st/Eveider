import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal-session';

export async function GET() {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { notifications } = createRepositories();
    const emailEnabled = await notifications.web.getEmailNotificationsEnabled(auth.session.userId);
    return NextResponse.json(ok({ emailNotificationsEnabled: emailEnabled }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePortalSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const body = (await request.json()) as { emailNotificationsEnabled?: unknown };
    if (typeof body.emailNotificationsEnabled !== 'boolean') {
      return NextResponse.json(fail('emailNotificationsEnabled requis'), { status: 400 });
    }
    const { notifications } = createRepositories();
    const emailEnabled = await notifications.web.setEmailNotificationsEnabled(
      auth.session.userId,
      body.emailNotificationsEnabled,
    );
    return NextResponse.json(ok({ emailNotificationsEnabled: emailEnabled }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
