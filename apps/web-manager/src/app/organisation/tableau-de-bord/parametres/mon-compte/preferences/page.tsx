import { PageFrame } from '@eveider/ui';
import { AccountPreferencesPanel } from '@/components/account-preferences-panel';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationPreferencesSettingsPage() {
  await requireBusinessPageContext();

  return (
    <PageFrame title="Préférences" description="Langue et apparence." layout="standard">
      <AccountPreferencesPanel />
    </PageFrame>
  );
}
