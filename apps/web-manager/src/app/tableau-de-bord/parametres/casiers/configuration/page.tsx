import { LockerNetworkSettingsForm } from '@/components/locker-network-settings-form';
import { getLockerNetworkSettings } from '@/server/locker-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminLockerConfigurationPage() {
  await getAdminSession();
  const settings = await getLockerNetworkSettings();
  return <LockerNetworkSettingsForm initialSettings={settings} />;
}
