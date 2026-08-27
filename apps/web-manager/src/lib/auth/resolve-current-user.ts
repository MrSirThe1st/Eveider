import { createRepositories } from '@eveider/data-access';
import type { User } from '@eveider/data-access';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type CurrentMembership = {
  id: string;
  userId: string;
  businessId: string;
  role: import('@eveider/domain').OrganizationRole;
  createdAt: Date;
  updatedAt: Date;
  isPlatformOrg: boolean;
  organizationName: string;
};

export type CurrentUser = {
  authUser: SupabaseUser;
  profile: User;
  memberships: CurrentMembership[];
};

/**
 * Resolves the authenticated Supabase session and Eveider profile once.
 * Uses getSession() only — middleware already refreshes tokens.
 */
export async function resolveCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some((cookie) => cookie.name.includes('-auth-token'));
  if (!hasSession) {
    return null;
  }

  const supabase = await createClient();
  let authUser: SupabaseUser | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authUser = user;
  } catch {
    return null;
  }

  if (!authUser) {
    return null;
  }

  const { users, memberships } = createRepositories();
  const profile = await users.findByAuthId(authUser.id);
  if (!profile || profile.isBlocked || profile.deletedAt || profile.deactivatedAt) {
    return null;
  }

  const rows = await memberships.listByUserIdWithOrgFlags(profile.id);
  return { authUser, profile, memberships: rows };
}
