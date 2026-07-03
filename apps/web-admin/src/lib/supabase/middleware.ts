import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isAuthNetworkError } from '@/lib/supabase/auth-errors';
import { getSupabaseEnv } from './env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && isAuthNetworkError(error)) {
      return { supabaseResponse, user: undefined, authCheckFailed: true as const };
    }

    return { supabaseResponse, user, authCheckFailed: false as const };
  } catch {
    // Transient Supabase/network errors must not clear an existing session.
    return { supabaseResponse, user: undefined, authCheckFailed: true as const };
  }
}
