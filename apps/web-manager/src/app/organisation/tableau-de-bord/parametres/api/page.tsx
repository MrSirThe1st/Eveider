import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationApiSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <SettingsComingSoon
      title="API"
      description="Pour relier Eveider à un autre logiciel."
    />
  );
}
