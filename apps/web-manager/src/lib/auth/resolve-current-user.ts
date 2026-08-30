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

/** Short TTL so silent API polls re-validate the session without reloading profile/memberships every tick. */
const IDENTITY_CACHE_TTL_MS = 30_000;

type CachedIdentity = {
  profile: User;
  memberships: CurrentMembership[];
  expiresAt: number;
};

const identityCache = new Map<string, CachedIdentity>();

export function invalidateCurrentUserCache(authUserId?: string): void {
  if (authUserId) {
    identityCache.delete(authUserId);
    return;
  }
  identityCache.clear();
}

/**
 * Resolves the authenticated Supabase session and Eveider profile once.
 * Always validates the session via getUser(); profile + memberships are cached briefly.
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

  const cached = identityCache.get(authUser.id);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.profile.isBlocked || cached.profile.deletedAt || cached.profile.deactivatedAt) {
      identityCache.delete(authUser.id);
      return null;
    }
    return { authUser, profile: cached.profile, memberships: cached.memberships };
  }

  const { users, memberships } = createRepositories();
  const profile = await users.findByAuthId(authUser.id);
  if (!profile || profile.isBlocked || profile.deletedAt || profile.deactivatedAt) {
    identityCache.delete(authUser.id);
    return null;
  }

  const rows = await memberships.listByUserIdWithOrgFlags(profile.id);
  identityCache.set(authUser.id, {
    profile,
    memberships: rows,
    expiresAt: Date.now() + IDENTITY_CACHE_TTL_MS,
  });

  return { authUser, profile, memberships: rows };
}
