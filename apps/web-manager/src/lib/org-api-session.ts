import {
  apiKeyLooksValid,
  createDataAccessContext,
  createRepositories,
  hashOrganizationApiKey,
  type DataAccessContext,
} from '@eveider/data-access';

export type OrgApiSession = {
  businessId: string;
  apiKeyId: string;
  ctx: DataAccessContext;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

export async function requireOrgApiKey(
  request: Request,
): Promise<{ session: OrgApiSession } | { error: string; status: number }> {
  const token = bearerToken(request);
  if (!token || !apiKeyLooksValid(token)) {
    return { error: "Clé d'accès invalide ou manquante", status: 401 };
  }

  const { organizationApi, businesses } = createRepositories();
  const key = await organizationApi.findActiveByHash(hashOrganizationApiKey(token));
  if (!key) {
    return { error: "Clé d'accès invalide ou manquante", status: 401 };
  }

  const allowed = await businesses.hasFeatureEnabled(key.businessId, 'API_ACCESS');
  if (!allowed) {
    return {
      error: "Eveider n'a pas activé la connexion à un logiciel pour votre entreprise.",
      status: 403,
    };
  }

  try {
    await organizationApi.touchLastUsed(key.id);
  } catch (error) {
    console.error('[eveider:org-api] last_used_at update failed', error);
  }

  const ctx = createDataAccessContext({
    organizationId: key.businessId,
    organizationRole: 'admin',
    apiKeyId: key.id,
  });

  return {
    session: {
      businessId: key.businessId,
      apiKeyId: key.id,
      ctx,
    },
  };
}
