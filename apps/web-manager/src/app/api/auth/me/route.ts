import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { UserRole } from '@eveider/domain';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';
import { getSupabaseEnv } from '@/lib/supabase/env';

const MOBILE_ROLES = ['customer', 'courier'] as const;
const WEB_ROLES = ['admin', 'business'] as const;

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function resolveAuthUser(request: Request) {
  const bearer = getBearerToken(request);
  if (bearer) {
    const { url, key } = getSupabaseEnv();
    const supabase = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user) return null;
    return data.user;
  }

  const current = await resolveCurrentUser();
  return current?.authUser ?? null;
}

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return withCors(NextResponse.json(fail('Non authentifié'), { status: 401 }));
    }

    const { onboarding } = createRepositories();
    const profile = await onboarding.findProfileByAuthId(user.id);

    if (!profile) {
      return withCors(NextResponse.json(fail('Profil utilisateur introuvable'), { status: 404 }));
    }

    if (profile.isBlocked) {
      return withCors(
        NextResponse.json(fail('Accès interdit : Compte suspendu ou bloqué'), { status: 403 }),
      );
    }

    const bearer = getBearerToken(request);
    const allowedRoles: readonly UserRole[] = bearer ? MOBILE_ROLES : WEB_ROLES;
    if (!allowedRoles.includes(profile.role)) {
      return withCors(
        NextResponse.json(fail('Rôle non autorisé pour cette application'), { status: 403 }),
      );
    }

    return withCors(
      NextResponse.json(
        ok({
          authId: user.id,
          phone: profile.phone ?? user.phone,
          email: user.email ?? profile.email,
          profile: {
            id: profile.id,
            role: profile.role,
            fullName: profile.fullName,
            email: profile.email,
            businessId: profile.businessId,
          },
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withCors(NextResponse.json(fail(message), { status: 403 }));
  }
}
