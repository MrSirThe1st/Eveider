import {
  AccessDeniedError,
  createDataAccessContext,
  type DataAccessContext,
} from '@eveider/data-access';
import { getCurrentUser } from '@/lib/auth/get-current-user';
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
  const current = await measure(perf, 'auth.resolveCurrentUser', () => getCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const profile = current.profile;
    if (!ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number])) {
      throw new AccessDeniedError('Rôle non autorisé pour cette application');
    }
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
  const current = await measure(perf, 'auth.resolveCurrentUser', () => getCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const profile = current.profile;
    if (!BUSINESS_ROLES.includes(profile.role as (typeof BUSINESS_ROLES)[number])) {
      throw new AccessDeniedError('Rôle non autorisé pour cette application');
    }

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
