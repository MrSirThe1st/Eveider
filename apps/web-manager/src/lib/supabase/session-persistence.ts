import type { CookieOptions } from '@supabase/ssr';

/** Preference cookie: "1" persist across browser restarts, "0" session-only. */
export const AUTH_PERSIST_COOKIE = 'eveider.auth-persist';

/** Matches @supabase/ssr DEFAULT_COOKIE_OPTIONS.maxAge (400 days). */
export const AUTH_PERSIST_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function isPersistentAuthSession(value: string | undefined | null): boolean {
  // Legacy sessions have no preference cookie and were always persistent.
  return value !== '0';
}

export function cookieOptionsForPersistence(
  options: CookieOptions,
  persist: boolean,
): CookieOptions {
  // Deletions must keep maxAge: 0 so the browser actually clears the cookie.
  if (persist || options.maxAge === 0) {
    return options;
  }

  const sessionOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;
  return sessionOptions;
}

function sameSiteAttribute(sameSite: CookieOptions['sameSite']): string | null {
  if (!sameSite) return null;
  if (sameSite === true) return 'Strict';
  const value = String(sameSite);
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);

  const sameSite = sameSiteAttribute(options.sameSite);
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  if (options.secure) parts.push('Secure');
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    const expires = options.expires instanceof Date ? options.expires : new Date(options.expires);
    parts.push(`Expires=${expires.toUTCString()}`);
  }

  return parts.join('; ');
}

export function getDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined' || !document.cookie) return [];

  return document.cookie.split(';').flatMap((part) => {
    const trimmed = part.trim();
    if (!trimmed) return [];
    const eq = trimmed.indexOf('=');
    const name = eq === -1 ? trimmed : decodeCookieComponent(trimmed.slice(0, eq));
    const raw = eq === -1 ? '' : trimmed.slice(eq + 1);
    return [{ name, value: decodeCookieComponent(raw) }];
  });
}

export function readDocumentCookie(name: string): string | null {
  const match = getDocumentCookies().find((cookie) => cookie.name === name);
  return match?.value ?? null;
}

export function setAuthPersistencePreference(persist: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = serializeCookie(
    AUTH_PERSIST_COOKIE,
    persist ? '1' : '0',
    persist
      ? { path: '/', sameSite: 'lax', maxAge: AUTH_PERSIST_MAX_AGE_SECONDS }
      : { path: '/', sameSite: 'lax' },
  );
}

export function clearAuthPersistencePreference() {
  if (typeof document === 'undefined') return;
  document.cookie = serializeCookie(AUTH_PERSIST_COOKIE, '', {
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });
}

function decodeCookieComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
