import { PageFrame } from '@eveider/ui';
import { PlatformSettingsForm } from '@/components/platform-settings-form';
import { getPlatformSettings } from '@/server/platform-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminPlatformSettingsPage() {
  await getAdminSession();
  const settings = await getPlatformSettings();

  return (
    <PageFrame
      title="Plateforme"
      description="Frais au casier, nouvelles entreprises, et limites de départ."
      layout="standard"
    >
      <PlatformSettingsForm initialSettings={settings} />
    </PageFrame>
  );
}
