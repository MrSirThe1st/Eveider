import { redirect } from 'next/navigation';
import { ORG_SETTINGS_ROUTES } from '@/lib/settings-nav';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationRolesSettingsPage() {
  await requireBusinessPermission('settings');
  redirect(ORG_SETTINGS_ROUTES.team);
}
