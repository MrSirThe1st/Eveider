import { fail, ok, onboardUserSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';
import { getSupabaseEnv } from '@/lib/supabase/env';

const MOBILE_ROLES = ['customer', 'courier'] as const;

function isMobileRole(role: string): role is (typeof MOBILE_ROLES)[number] {
  return MOBILE_ROLES.includes(role as (typeof MOBILE_ROLES)[number]);
}

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
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return withCors(NextResponse.json(fail('Non authentifié'), { status: 401 }));
    }

    const body = onboardUserSchema.safeParse(await request.json());
    if (!body.success) {
      return withCors(
        NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), { status: 400 }),
      );
    }

    const bearer = getBearerToken(request);

    if (bearer) {
      if (!isMobileRole(body.data.role)) {
        return withCors(
          NextResponse.json(fail('Rôle non autorisé sur cette API'), { status: 400 }),
        );
      }
    } else if (body.data.role !== 'business') {
      return withCors(
        NextResponse.json(fail('Rôle non autorisé sur ce portail'), { status: 400 }),
      );
    }

    const { onboarding } = createRepositories();
    const profile = await onboarding.ensureProfile(user.id, {
      role: body.data.role,
      fullName: body.data.fullName,
      phone: body.data.phone ?? user.phone ?? undefined,
      email: body.data.email ?? user.email ?? undefined,
      inviteToken: body.data.inviteToken,
      business: body.data.business,
    });

    return withCors(
      NextResponse.json(
        ok({
          id: profile.id,
          role: profile.role,
          businessId: profile.businessId,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
