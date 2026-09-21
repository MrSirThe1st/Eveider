import { createBrowserClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';
import {
  AUTH_PERSIST_COOKIE,
  clearAuthPersistencePreference,
  cookieOptionsForPersistence,
  getDocumentCookies,
  isPersistentAuthSession,
  readDocumentCookie,
  serializeCookie,
} from './session-persistence';

let browserClient: SupabaseClient | undefined;

function browserCookieMethods() {
  return {
    getAll() {
      return getDocumentCookies();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      const persist = isPersistentAuthSession(readDocumentCookie(AUTH_PERSIST_COOKIE));
      for (const { name, value, options } of cookiesToSet) {
        document.cookie = serializeCookie(
          name,
          value,
          cookieOptionsForPersistence(options, persist),
        );
      }
    },
  };
}

export function createClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabaseEnv();
  browserClient = createBrowserClient(url, key, {
    // Eveider owns the singleton so cookie lifetime can follow "remember me".
    isSingleton: false,
    ...(typeof document === 'undefined' ? {} : { cookies: browserCookieMethods() }),
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

export async function signOutClient(supabase = createClient()) {
  await supabase.auth.signOut();
  clearAuthPersistencePreference();
}
