import { redirect } from 'next/navigation';
import { ORG_SETTINGS_ROUTES } from '@/lib/settings-nav';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationNotificationSettingsPage() {
  await requireBusinessPageContext();
  redirect(ORG_SETTINGS_ROUTES.profile);
}
