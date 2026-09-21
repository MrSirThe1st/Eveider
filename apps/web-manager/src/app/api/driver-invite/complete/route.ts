import { fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

async function resolveAuthId(request: Request) {
  const header = request.headers.get('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) {
      const { url, key } = getSupabaseEnv();
      const supabase = createSupabaseClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) return data.user.id;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function complete(request: Request) {
  const authId = await resolveAuthId(request);
  if (!authId) {
    return withCors(NextResponse.json(fail('Non authentifié'), { status: 401 }));
  }

  try {
    const { accounts } = createRepositories();
    const result = await accounts.completeDriverMagicLink(authId);
    return withCors(NextResponse.json(ok(result)));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return withCors(NextResponse.json(fail(message), { status }));
  }
}

export async function GET(request: Request) {
  return complete(request);
}

export async function POST(request: Request) {
  return complete(request);
}
