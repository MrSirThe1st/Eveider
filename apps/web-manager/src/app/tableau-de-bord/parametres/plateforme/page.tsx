import { PageFrame } from '@eveider/ui';
import { PlatformSettingsForm } from '@/components/platform-settings-form';
import { getPlatformSettings } from '@/server/platform-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminPlatformSettingsPage() {
  await getAdminSession();
  const settings = await getPlatformSettings();

  return (
    <PageFrame
      title="Règles générales"
      description="Pour toute la plateforme Eveider : frais payés au casier, et réglages de départ des nouvelles entreprises."
      layout="standard"
    >
      <PlatformSettingsForm initialSettings={settings} />
    </PageFrame>
  );
}
