import { createRepositories } from '@eveider/data-access';

export type OrganizationApiKeyView = {
  id: string;
  businessId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type OrganizationApiEndpointView = {
  id: string;
  url: string | null;
  signingSecret: string;
  status: 'active' | 'disabled';
};

export type OrganizationApiSettingsView = {
  apiAccessEnabled: boolean;
  keys: OrganizationApiKeyView[];
  endpoint: OrganizationApiEndpointView | null;
};

export async function loadOrganizationApiSettings(
  businessId: string,
): Promise<OrganizationApiSettingsView> {
  const { businesses, organizationApi } = createRepositories();
  const apiAccessEnabled = await businesses.hasFeatureEnabled(businessId, 'API_ACCESS');
  if (!apiAccessEnabled) {
    return { apiAccessEnabled: false, keys: [], endpoint: null };
  }

  const [keys, endpoint] = await Promise.all([
    organizationApi.listKeys(businessId),
    organizationApi.getEndpoint(businessId),
  ]);

  return {
    apiAccessEnabled: true,
    keys: keys.map((key) => ({
      id: key.id,
      businessId: key.businessId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
      revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
      createdAt: key.createdAt.toISOString(),
    })),
    endpoint: endpoint
      ? {
          id: endpoint.id,
          url: endpoint.url,
          signingSecret: endpoint.signingSecret,
          status: endpoint.status,
        }
      : null,
  };
}
