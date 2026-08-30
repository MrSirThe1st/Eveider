import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationRolesSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <SettingsComingSoon
      title="Droits d’accès"
      description="Qui peut voir ou modifier quoi dans votre entreprise."
    />
  );
}
