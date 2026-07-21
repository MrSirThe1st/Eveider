import {
  AccessDeniedError,
  createDataAccessContext,
  createRepositories,
  type DataAccessContext,
} from '@eveider/data-access';
import type { User } from '@supabase/supabase-js';
import {
  getCachedProfile,
  getCachedValidatedUser,
  setCachedProfile,
  setCachedValidatedUser,
} from '@/lib/auth-cache';
import type { PerfTimer } from '@/lib/perf/request-timer';
import { isAuthNetworkError } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin'] as const;
const BUSINESS_ROLES = ['business'] as const;

async function measure<T>(perf: PerfTimer | undefined, label: string, fn: () => Promise<T>): Promise<T> {
  if (perf) return perf.measure(label, fn);
  return fn();
}

async function readSessionUser(
  perf: PerfTimer | undefined,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<User | null> {
  const {
    data: { session },
  } = await measure(perf, 'auth.getSession', () => supabase.auth.getSession());
  return session?.user ?? null;
}

async function resolveAuthUser(perf?: PerfTimer): Promise<User | null> {
  const supabase = await measure(perf, 'auth.createClient', () => createClient());
  const sessionUser = await readSessionUser(perf, supabase);

  if (!sessionUser) {
    return null;
  }

  const cachedUser = getCachedValidatedUser(sessionUser.id);
  if (cachedUser) {
    await measure(perf, 'auth.cacheHit (user)', async () => cachedUser);
    return cachedUser;
  }

  try {
    const { data, error } = await measure(perf, 'auth.getUser', () => supabase.auth.getUser());

    if (data.user) {
      setCachedValidatedUser(data.user);
      return data.user;
    }

    if (error && isAuthNetworkError(error)) {
      await measure(perf, 'auth.getSession (fallback)', async () => undefined);
      return sessionUser;
    }

    return null;
  } catch {
    await measure(perf, 'auth.getSession (catch)', async () => undefined);
    return sessionUser;
  }
}

export type AdminSession = {
  authId: string;
  profile: {
    id: string;
    role: string;
    email: string | null;
    fullName: string | null;
  };
  ctx: DataAccessContext;
};

export async function requireAdminSession(
  perf?: PerfTimer,
): Promise<{ session: AdminSession } | { error: string; status: number }> {
  const user = await resolveAuthUser(perf);

  if (!user) {
    return { error: 'Non authentifié', status: 401 };
  }

  const cachedProfile = getCachedProfile<AdminSession['profile']>(user.id, 'admin');
  if (cachedProfile) {
    await measure(perf, 'auth.cacheHit (profile)', async () => cachedProfile);
    return {
      session: {
        authId: user.id,
        profile: cachedProfile,
        ctx: createDataAccessContext('admin', { userId: cachedProfile.id }),
      },
    };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await measure(perf, 'db.requireRole', () =>
      onboarding.requireRole(user.id, ADMIN_ROLES),
    );
    setCachedProfile(user.id, 'admin', profile);
    const ctx = createDataAccessContext('admin', { userId: profile.id });

    return {
      session: {
        authId: user.id,
        profile,
        ctx,
      },
    };
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 };
  }
}

export type BusinessSession = {
  authId: string;
  profile: {
    id: string;
    businessId: string | null;
    role: string;
    email: string | null;
  };
  ctx: DataAccessContext;
};

export async function requireBusinessSession(
  perf?: PerfTimer,
): Promise<{ session: BusinessSession } | { error: string; status: number }> {
  const user = await resolveAuthUser(perf);

  if (!user) {
    return { error: 'Non authentifié', status: 401 };
  }

  const cachedProfile = getCachedProfile<BusinessSession['profile']>(user.id, 'business');
  if (cachedProfile) {
    await measure(perf, 'auth.cacheHit (profile)', async () => cachedProfile);

    if (!cachedProfile.businessId) {
      return { error: 'Compte entreprise requis', status: 403 };
    }

    return {
      session: {
        authId: user.id,
        profile: cachedProfile,
        ctx: createDataAccessContext('business', {
          userId: cachedProfile.id,
          businessId: cachedProfile.businessId,
        }),
      },
    };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await measure(perf, 'db.requireRole', () =>
      onboarding.requireRole(user.id, BUSINESS_ROLES),
    );

    if (!profile.businessId) {
      return { error: 'Compte entreprise requis', status: 403 };
    }

    setCachedProfile(user.id, 'business', profile);

    const ctx = createDataAccessContext('business', {
      userId: profile.id,
      businessId: profile.businessId,
    });

    return {
      session: {
        authId: user.id,
        profile,
        ctx,
      },
    };
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 };
  }
}
