import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';
import {
  AUTH_PERSIST_COOKIE,
  cookieOptionsForPersistence,
  isPersistentAuthSession,
} from './session-persistence';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  const persist = isPersistentAuthSession(cookieStore.get(AUTH_PERSIST_COOKIE)?.value);

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, cookieOptionsForPersistence(options, persist));
          });
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}
