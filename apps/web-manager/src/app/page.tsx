import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { UserRole } from '@eveider/domain';

export default async function HomePage() {
  const current = await getCurrentUser();

  if (current) {
    const destination = getAuthenticatedLandingPath(current.profile.role as UserRole);
    if (destination && destination !== '/') {
      redirect(destination);
    }
  }

  return <LandingPage />;
}
