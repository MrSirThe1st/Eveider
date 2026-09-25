import { acceptDriverInviteSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';

export async function POST(request: Request) {
  const current = await resolveCurrentUser();
  if (!current) {
    return NextResponse.json(fail('Non authentifié'), { status: 401 });
  }

  const body = acceptDriverInviteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const email = current.profile.email;
  if (!email) {
    return NextResponse.json(fail('Profil email introuvable'), { status: 400 });
  }

  try {
    const { accounts } = createRepositories();
    const result = await accounts.acceptDriverInvite({
      token: body.data.token,
      authId: current.authUser.id,
      email,
      fullName: current.profile.fullName ?? undefined,
      phone: current.profile.phone ?? undefined,
    });
    return NextResponse.json(ok(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
