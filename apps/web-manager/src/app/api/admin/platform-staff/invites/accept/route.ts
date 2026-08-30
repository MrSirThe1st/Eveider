import { acceptPlatformAdminInviteSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = acceptPlatformAdminInviteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { platformStaff, users } = createRepositories();
    const profile = await users.findById(auth.session.profile.id);
    if (!profile?.email) {
      return NextResponse.json(fail('Profil email introuvable'), { status: 400 });
    }

    await platformStaff.acceptForUser({
      token: body.data.token,
      email: profile.email,
      userId: auth.session.profile.id,
    });
    return NextResponse.json(ok({ accepted: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
