import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationIntegrationsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <SettingsComingSoon
      title="Intégrations"
      description="Reliez des outils comme Excel, Gmail ou Drive."
    />
  );
}
