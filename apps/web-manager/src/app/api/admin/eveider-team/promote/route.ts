import { fail, ok, promoteEveiderDispatcherSchema } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { requirePlatformOrganizationId } from '@/server/platform-staff';

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = promoteEveiderDispatcherSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const platformOrgId = await requirePlatformOrganizationId();
    const { users, memberships } = createRepositories();
    const user = await users.findByEmail(body.data.email);
    if (!user) {
      throw new Error('Aucun compte trouvé pour cette adresse email');
    }

    const existing = await memberships.find(user.id, platformOrgId);
    if (existing?.role === 'dispatcher') {
      throw new Error('Cette personne est déjà dispatcher');
    }
    if (existing?.role === 'account_owner' || existing?.role === 'admin') {
      throw new Error('Ce compte a déjà un rôle d’administration sur Eveider');
    }

    await memberships.upsert({
      userId: user.id,
      businessId: platformOrgId,
      role: 'dispatcher',
    });

    return NextResponse.json(
      ok({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
