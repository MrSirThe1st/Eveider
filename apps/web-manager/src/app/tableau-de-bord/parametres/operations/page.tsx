import { PageFrame } from '@eveider/ui';
import { PlatformSettingsForm } from '@/components/platform-settings-form';
import { getPlatformSettings } from '@/server/platform-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminOperationsSettingsPage() {
  await getAdminSession();
  const settings = await getPlatformSettings();

  return (
    <PageFrame
      title="Opérations"
      description="Attribution des livraisons et règles opérationnelles chauffeurs."
      layout="standard"
    >
      <PlatformSettingsForm initialSettings={settings} mode="operations" />
    </PageFrame>
  );
}
