import { AccessDeniedError, createDataAccessContext, createRepositories } from '@eveider/data-access';
import type { UserRole } from '@eveider/domain';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/supabase/env';

const CUSTOMER_ROLES = ['customer'] as const;
const COURIER_ROLES = ['courier'] as const;

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function requireMobileRole(request: Request, allowedRoles: readonly UserRole[]) {
  const bearer = getBearerToken(request);
  if (!bearer) {
    return { error: 'Non authentifié', status: 401 } as const;
  }

  const { url, key } = getSupabaseEnv();
  const supabase = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(bearer);

  if (error || !data.user) {
    return { error: 'Non authentifié', status: 401 } as const;
  }

  try {
    const { onboarding } = createRepositories();
    const profile = await onboarding.requireRole(data.user.id, allowedRoles);
    const ctx = createDataAccessContext(profile.role, {
      userId: profile.id,
      phone: profile.phone ?? data.user.phone ?? undefined,
    });

    return {
      session: {
        authId: data.user.id,
        profile,
        ctx,
      },
    } as const;
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 } as const;
  }
}

export async function requireCustomerSession(request: Request) {
  return requireMobileRole(request, CUSTOMER_ROLES);
}

export async function requireCourierSession(request: Request) {
  return requireMobileRole(request, COURIER_ROLES);
}

export function withMobileCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
