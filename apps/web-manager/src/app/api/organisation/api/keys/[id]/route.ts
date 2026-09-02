import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { businesses } = createRepositories();
  const allowed = await businesses.hasFeatureEnabled(auth.session.profile.businessId, 'API_ACCESS');
  if (!allowed) {
    return NextResponse.json(
      fail("Eveider n'a pas activé la connexion à un logiciel pour votre entreprise."),
      { status: 403 },
    );
  }

  const { id } = await context.params;
  try {
    const { organizationApi } = createRepositories();
    await organizationApi.revokeKey(auth.session.ctx, auth.session.profile.businessId, id);
    return NextResponse.json(ok({ revoked: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
