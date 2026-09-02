import { PageFrame } from '@eveider/ui';
import { AccountPreferencesPanel } from '@/components/account-preferences-panel';
import { requireWebRole } from '@/lib/require-web-role';

export default async function AdminPreferencesSettingsPage() {
  await requireWebRole(['admin']);

  return (
    <PageFrame title="Préférences" description="Langue et apparence." layout="standard">
      <AccountPreferencesPanel />
    </PageFrame>
  );
}
