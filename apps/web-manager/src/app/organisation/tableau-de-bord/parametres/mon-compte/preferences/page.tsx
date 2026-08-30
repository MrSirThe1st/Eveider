import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationPreferencesSettingsPage() {
  await requireBusinessPageContext();
  return (
    <SettingsComingSoon
      title="Préférences"
      description="Langue et apparence."
    />
  );
}
