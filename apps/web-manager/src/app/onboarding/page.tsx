import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function OnboardingRedirectPage() {
  redirect(WEB_ROUTES.businessVerification);
}
