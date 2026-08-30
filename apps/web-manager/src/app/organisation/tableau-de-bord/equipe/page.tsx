import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessTeamRedirectPage() {
  redirect(WEB_ROUTES.businessTeam);
}
