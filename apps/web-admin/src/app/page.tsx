import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import { createRepositories } from '@eveider/data-access';
import type { UserRole } from '@eveider/domain';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { onboarding } = createRepositories();
    const profile = await onboarding.findProfileByAuthId(user.id);

    if (profile) {
      redirect(getAuthenticatedLandingPath(profile.role as UserRole));
    }
  }

  return <LandingPage />;
}
