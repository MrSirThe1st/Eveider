import { PageFrame } from '@eveider/ui';
import { AdminCasiersSettingsTabs, AdminParametresTabs } from '@/components/admin-module-tabs';
import { LockerNetworkSettingsForm } from '@/components/locker-network-settings-form';
import { getLockerNetworkSettings } from '@/server/locker-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminLockerConfigurationPage() {
  await getAdminSession();
  const settings = await getLockerNetworkSettings();

  return (
    <PageFrame
      title="Casiers"
      description="Règles réseau pour tailles, suggestions d’affectation et rétention."
      layout="standard"
    >
      <AdminParametresTabs />
      <AdminCasiersSettingsTabs />
      <LockerNetworkSettingsForm initialSettings={settings} />
    </PageFrame>
  );
}
