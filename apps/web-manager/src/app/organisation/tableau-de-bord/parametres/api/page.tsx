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
      description="Reliez Eveider à votre logiciel : clé d’accès et adresse de notification."
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
