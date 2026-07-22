import { createRepositories } from '@eveider/data-access';
import type { User } from '@eveider/data-access';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type CurrentUser = {
  authUser: SupabaseUser;
  profile: User;
};

/**
 * Resolves the authenticated Supabase session and Eveider profile once.
 * Uses getSession() only — middleware already refreshes tokens.
 */
export async function resolveCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUser = session?.user;
  if (!authUser) {
    return null;
  }

  const { users } = createRepositories();
  const profile = await users.findByAuthId(authUser.id);
  if (!profile || profile.isBlocked) {
    return null;
  }

  return { authUser, profile };
}
