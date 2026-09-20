import { redirect } from 'next/navigation';
import { ADMIN_SETTINGS_ROUTES } from '@/lib/settings-nav';

export default function AdminRolesSettingsPage() {
  redirect(ADMIN_SETTINGS_ROUTES.admins);
}
