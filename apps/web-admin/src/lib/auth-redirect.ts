import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import type { UserRole } from '@eveider/domain';
import { createRepositories } from '@eveider/data-access';
import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedDashboardPath(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { onboarding } = createRepositories();
  const profile = await onboarding.findProfileByAuthId(user.id);
  if (!profile) {
    return null;
  }

  return getAuthenticatedLandingPath(profile.role as UserRole);
}
