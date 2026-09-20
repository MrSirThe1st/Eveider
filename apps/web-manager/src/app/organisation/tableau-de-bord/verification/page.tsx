import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function OrganizationVerificationRedirectPage() {
  redirect(WEB_ROUTES.businessDashboard);
}
