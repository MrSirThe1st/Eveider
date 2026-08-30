import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessBillingRedirectPage() {
  redirect(WEB_ROUTES.businessBilling);
}
