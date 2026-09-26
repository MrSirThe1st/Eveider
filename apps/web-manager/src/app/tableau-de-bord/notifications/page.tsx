import { PageFrame } from '@eveider/ui';
import { NotificationsPageClient } from '@/components/notifications-page-client';
import { requireWebRole } from '@/lib/require-web-role';

export default async function AdminNotificationsPage() {
  await requireWebRole(['admin']);

  return (
    <PageFrame
      title="Notifications"
      description="Historique des alertes opérationnelles."
      layout="standard"
    >
      <NotificationsPageClient />
    </PageFrame>
  );
}
