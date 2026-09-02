import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationTeamsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <SettingsComingSoon
      title="Équipes"
      description="Regroupez les dispatchers et les chauffeurs."
    />
  );
}
