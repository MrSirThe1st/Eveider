import { PageFrame } from '@eveider/ui';
import { OrganizationApiSettingsPanel } from '@/components/organization-api-settings-panel';
import { requireBusinessPermission } from '@/server/business';
import { loadOrganizationApiSettings } from '@/server/organization-api';

export default async function OrganizationApiSettingsPage() {
  const { profile } = await requireBusinessPermission('settings');
  const settings = await loadOrganizationApiSettings(profile.businessId);

  return (
    <PageFrame
      title="API"
      description="Connexion avancée : clé d’accès et notifications vers un autre logiciel."
      layout="standard"
    >
      <OrganizationApiSettingsPanel
        apiAccessEnabled={settings.apiAccessEnabled}
        keys={settings.keys}
        endpoint={settings.endpoint}
      />
    </PageFrame>
  );
}
