import { redirect } from 'next/navigation';
import { ORG_SETTINGS_ROUTES } from '@/lib/settings-nav';

/** Legacy /membres → /equipe */
export default function OrganizationMembersRedirectPage() {
  redirect(ORG_SETTINGS_ROUTES.team);
}
