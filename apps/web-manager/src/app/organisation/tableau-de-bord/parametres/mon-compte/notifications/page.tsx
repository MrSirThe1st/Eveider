import { SettingsComingSoon } from '@/components/settings-coming-soon';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationNotificationSettingsPage() {
  await requireBusinessPageContext();
  return (
    <SettingsComingSoon
      title="Notifications"
      description="Comment Eveider vous prévient."
    />
  );
}
