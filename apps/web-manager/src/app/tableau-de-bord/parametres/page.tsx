import { redirect } from 'next/navigation';
import { ADMIN_SETTINGS_ROUTES } from '@/lib/settings-nav';

export default function AdminSettingsIndexPage() {
  redirect(ADMIN_SETTINGS_ROUTES.profile);
}
