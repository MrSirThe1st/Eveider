import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationLockersSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <SettingsComingSoon
      title="Casiers"
      description="Tailles et réglages des casiers de votre entreprise."
    />
  );
}
