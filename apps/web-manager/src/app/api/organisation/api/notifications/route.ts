import { fail, ok, updateNotificationEndpointSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

async function requireApiAccessSession() {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) return auth;
  const { businesses } = createRepositories();
  const allowed = await businesses.hasFeatureEnabled(auth.session.profile.businessId, 'API_ACCESS');
  if (!allowed) {
    return {
      error: "Eveider n'a pas activé la connexion à un logiciel pour votre entreprise.",
      status: 403,
    };
  }
  return auth;
}

export async function PUT(request: Request) {
  const auth = await requireApiAccessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateNotificationEndpointSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { organizationApi } = createRepositories();
    const endpoint = await organizationApi.upsertEndpoint(
      auth.session.ctx,
      auth.session.profile.businessId,
      body.data.url,
    );
    return NextResponse.json(
      ok({
        endpoint: {
          id: endpoint.id,
          url: endpoint.url,
          signingSecret: endpoint.signingSecret,
          status: endpoint.status,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('https') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
