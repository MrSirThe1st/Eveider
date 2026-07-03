import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import type { UserRole } from '@eveider/domain';
import { createRepositories } from '@eveider/data-access';
import { redirect } from 'next/navigation';
import { isAuthNetworkError } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

export async function requireWebRole(allowedRoles: readonly UserRole[]) {
  const supabase = await createClient();

  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;

    if (!user && error && isAuthNetworkError(error)) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      user = session?.user ?? null;
    }
  } catch {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  if (!user) {
    redirect('/connexion');
  }

  const { onboarding } = createRepositories();
  const profile = await onboarding.findProfileByAuthId(user.id);

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    const fallback = profile ? getAuthenticatedLandingPath(profile.role as UserRole) : null;
    redirect(fallback ?? '/connexion');
  }

  return profile;
}
