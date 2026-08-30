import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationSecuritySettingsPage() {
  await requireBusinessPageContext();
  return (
    <SettingsComingSoon
      title="Sécurité"
      description="Mot de passe et sessions de connexion."
    />
  );
}
