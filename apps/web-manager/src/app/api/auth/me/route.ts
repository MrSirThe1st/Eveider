import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { User } from '@eveider/data-access';
import { deriveUserRole } from '@eveider/domain';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';
import { getSupabaseEnv } from '@/lib/supabase/env';

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

type ResolvedAuth = {
  authUser: SupabaseUser;
  profile: User | null;
};

async function resolveAuth(request: Request): Promise<ResolvedAuth | null> {
  const bearer = getBearerToken(request);
  if (bearer) {
    const { url, key } = getSupabaseEnv();
    const supabase = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user) return null;
    return { authUser: data.user, profile: null };
  }

  return resolveCurrentUser();
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
    const current = await resolveAuth(request);
    if (!current) {
      return withCors(NextResponse.json(fail('Non authentifié'), { status: 401 }));
    }

    const { authUser } = current;
    let profile = current.profile;
    if (!profile) {
      const { onboarding } = createRepositories();
      profile = await onboarding.findProfileByAuthId(authUser.id);
    }

    if (!profile) {
      return withCors(NextResponse.json(fail('Profil utilisateur introuvable'), { status: 404 }));
    }

    if (profile.isBlocked) {
      return withCors(
        NextResponse.json(fail('Accès interdit : Compte suspendu ou bloqué'), { status: 403 }),
      );
    }
    if (profile.deletedAt) {
      return withCors(
        NextResponse.json(fail('Accès interdit : Compte supprimé'), { status: 403 }),
      );
    }
    if (profile.deactivatedAt) {
      return withCors(
        NextResponse.json(fail('Accès interdit : Compte désactivé'), { status: 403 }),
      );
    }

    const { memberships, accounts } = createRepositories();
    const rows = await memberships.listByUserIdWithOrgFlags(profile.id);
    const membershipRefs = rows.map((membership) => ({
      organizationId: membership.businessId,
      role: membership.role,
      isPlatformOrg: membership.isPlatformOrg,
    }));

    const bearer = getBearerToken(request);
    const surface = bearer ? 'mobile' : 'web';
    const persona = deriveUserRole({
      isCustomer: profile.isCustomer,
      platformRole: profile.platformRole,
      memberships: membershipRefs,
      surface,
    });

    if (!persona) {
      return withCors(
        NextResponse.json(fail('Rôle non autorisé pour cette application'), { status: 403 }),
      );
    }

    if (persona === 'driver') {
      await accounts.activateOnLogin(profile);
    }

    const activeOrg = rows.find((row) => row.role === persona || row.businessId) ?? rows[0];
    const webOrg = rows.find((row) => !row.isPlatformOrg && row.role !== 'driver');

    return withCors(
      NextResponse.json(
        ok({
          authId: authUser.id,
          phone: profile.phone ?? authUser.phone,
          email: authUser.email ?? profile.email,
          profile: {
            id: profile.id,
            role: persona === 'driver' ? 'courier' : persona === 'organization' ? 'business' : persona,
            persona,
            isCustomer: profile.isCustomer,
            platformRole: profile.platformRole,
            fullName: profile.fullName,
            email: profile.email,
            businessId: webOrg?.businessId ?? activeOrg?.businessId ?? null,
            userRole: webOrg?.role ?? null,
            memberships: rows.map((row) => ({
              organizationId: row.businessId,
              organizationName: row.organizationName,
              role: row.role,
              isPlatformOrg: row.isPlatformOrg,
            })),
          },
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withCors(NextResponse.json(fail(message), { status: 403 }));
  }
}
