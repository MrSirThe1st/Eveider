import {
  AccessDeniedError,
  createDataAccessContext,
  createRepositories,
  type DataAccessContext,
} from '@eveider/data-access';
import { isAuthNetworkError } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin'] as const;
const BUSINESS_ROLES = ['business'] as const;

async function resolveAuthUser() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return data.user;

    if (error && isAuthNetworkError(error)) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user ?? null;
    }

    return null;
  } catch {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
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

export async function requireAdminSession(): Promise<
  { session: AdminSession } | { error: string; status: number }
> {
  const user = await resolveAuthUser();

  if (!user) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await onboarding.requireRole(user.id, ADMIN_ROLES);
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

export async function requireBusinessSession(): Promise<
  { session: BusinessSession } | { error: string; status: number }
> {
  const user = await resolveAuthUser();

  if (!user) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await onboarding.requireRole(user.id, BUSINESS_ROLES);

    if (!profile.businessId) {
      return { error: 'Compte entreprise requis', status: 403 };
    }

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
