import {
  AccessDeniedError,
  createDataAccessContext,
  createRepositories,
  type DataAccessContext,
} from '@eveider/data-access';
import { createClient } from '@/lib/supabase/server';

const BUSINESS_ROLES = ['business', 'admin'] as const;

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
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
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
