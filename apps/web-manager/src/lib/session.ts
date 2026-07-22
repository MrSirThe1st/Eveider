import {
  AccessDeniedError,
  createDataAccessContext,
  createRepositories,
  type DataAccessContext,
} from '@eveider/data-access';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';
import type { PerfTimer } from '@/lib/perf/request-timer';

const ADMIN_ROLES = ['admin'] as const;
const BUSINESS_ROLES = ['business'] as const;

async function measure<T>(perf: PerfTimer | undefined, label: string, fn: () => Promise<T>): Promise<T> {
  if (perf) return perf.measure(label, fn);
  return fn();
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
  const current = await measure(perf, 'auth.resolveCurrentUser', () => resolveCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await measure(perf, 'db.requireRole', () =>
      onboarding.requireRole(current.authUser.id, ADMIN_ROLES),
    );
    const ctx = createDataAccessContext('admin', { userId: profile.id });

    return {
      session: {
        authId: current.authUser.id,
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
  const current = await measure(perf, 'auth.resolveCurrentUser', () => resolveCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await measure(perf, 'db.requireRole', () =>
      onboarding.requireRole(current.authUser.id, BUSINESS_ROLES),
    );

    if (!profile.businessId) {
      return { error: 'Compte entreprise requis', status: 403 };
    }

    const ctx = createDataAccessContext('business', {
      userId: profile.id,
      businessId: profile.businessId,
    });

    return {
      session: {
        authId: current.authUser.id,
        profile,
        ctx,
      },
    };
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 };
  }
}
