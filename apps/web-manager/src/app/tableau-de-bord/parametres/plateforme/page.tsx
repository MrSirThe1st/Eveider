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
      description="Pour toute la plateforme Eveider : devise et contacts."
      layout="standard"
    >
      <PlatformSettingsForm initialSettings={settings} />
    </PageFrame>
  );
}
