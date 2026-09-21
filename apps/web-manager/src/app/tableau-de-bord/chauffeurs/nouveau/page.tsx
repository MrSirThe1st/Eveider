import { redirect } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function AdminNewDriverLegacyRedirectPage() {
  redirect(WEB_ROUTES.adminNewDriver);
}
