import { PageFrame } from '@eveider/ui';
import { NotificationsPageClient } from '@/components/notifications-page-client';
import { requireWebRole } from '@/lib/require-web-role';

export default async function BusinessNotificationsPage() {
  await requireWebRole(['organization']);

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
