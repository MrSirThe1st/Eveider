import { PageFrame } from '@eveider/ui';
import { NotificationSettingsPanel } from '@/components/notification-settings-panel';
import { requireWebRole } from '@/lib/require-web-role';

export default async function AdminNotificationSettingsPage() {
  await requireWebRole(['admin']);

  return (
    <PageFrame
      title="Notifications"
      description="Préférences d’alerte pour votre compte."
      layout="standard"
    >
      <NotificationSettingsPanel />
    </PageFrame>
  );
}
