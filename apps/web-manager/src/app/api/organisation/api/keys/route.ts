import { createOrganizationApiKeySchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

async function requireApiSettingsSession() {
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

export async function POST(request: Request) {
  const auth = await requireApiSettingsSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createOrganizationApiKeySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { organizationApi } = createRepositories();
    const created = await organizationApi.createKey(
      auth.session.ctx,
      auth.session.profile.businessId,
      body.data.name,
    );
    return NextResponse.json(
      ok({
        key: created.key,
        plaintext: created.plaintext,
      }),
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('au plus') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
