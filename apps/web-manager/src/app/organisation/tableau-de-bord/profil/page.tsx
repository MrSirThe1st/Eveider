import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessProfileRedirectPage() {
  redirect(WEB_ROUTES.businessSettings);
}
