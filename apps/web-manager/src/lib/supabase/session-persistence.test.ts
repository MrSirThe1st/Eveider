import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_PERSIST_COOKIE,
  AUTH_PERSIST_MAX_AGE_SECONDS,
  clearAuthPersistencePreference,
  cookieOptionsForPersistence,
  getDocumentCookies,
  isPersistentAuthSession,
  readDocumentCookie,
  serializeCookie,
  setAuthPersistencePreference,
} from './session-persistence';

describe('isPersistentAuthSession', () => {
  it('treats missing and "1" as persistent, "0" as session-only', () => {
    expect(isPersistentAuthSession(undefined)).toBe(true);
    expect(isPersistentAuthSession(null)).toBe(true);
    expect(isPersistentAuthSession('1')).toBe(true);
    expect(isPersistentAuthSession('0')).toBe(false);
  });
});

describe('cookieOptionsForPersistence', () => {
  it('keeps maxAge for persistent sessions', () => {
    const options = { path: '/', sameSite: 'lax' as const, maxAge: 100 };
    expect(cookieOptionsForPersistence(options, true)).toEqual(options);
  });

  it('strips maxAge and expires for session-only cookies', () => {
    expect(
      cookieOptionsForPersistence(
        { path: '/', sameSite: 'lax', maxAge: 100, expires: new Date('2030-01-01') },
        false,
      ),
    ).toEqual({ path: '/', sameSite: 'lax' });
  });

  it('keeps maxAge 0 so cookie deletions still clear', () => {
    const options = { path: '/', sameSite: 'lax' as const, maxAge: 0 };
    expect(cookieOptionsForPersistence(options, false)).toEqual(options);
  });
});

describe('serializeCookie', () => {
  it('writes Max-Age only when persistence options include it', () => {
    expect(serializeCookie('a', 'b', { path: '/', sameSite: 'lax' })).not.toMatch(/Max-Age/);
    expect(serializeCookie('a', 'b', { path: '/', sameSite: 'lax', maxAge: 100 })).toContain(
      'Max-Age=100',
    );
  });
});

describe('document cookie preference', () => {
  const cookieJar = new Map<string, string>();

  afterEach(() => {
    vi.unstubAllGlobals();
    cookieJar.clear();
  });

  function stubDocument() {
    cookieJar.clear();
    vi.stubGlobal('document', {
      get cookie() {
        return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
      },
      set cookie(value: string) {
        const [pair] = value.split(';');
        if (!pair) return;
        const eq = pair.indexOf('=');
        const name = decodeURIComponent(pair.slice(0, eq).trim());
        const raw = pair.slice(eq + 1).trim();
        if (value.includes('Max-Age=0')) {
          cookieJar.delete(name);
          return;
        }
        cookieJar.set(name, raw);
      },
    });
  }

  it('stores a persistent or session-only preference without touching passwords', () => {
    stubDocument();
    setAuthPersistencePreference(true);
    expect(readDocumentCookie(AUTH_PERSIST_COOKIE)).toBe('1');
    expect(cookieJar.get(AUTH_PERSIST_COOKIE)).toBe('1');
    expect([...cookieJar.values()].join(' ')).not.toMatch(/password/i);

    setAuthPersistencePreference(false);
    expect(readDocumentCookie(AUTH_PERSIST_COOKIE)).toBe('0');
    expect(getDocumentCookies()).toEqual([{ name: AUTH_PERSIST_COOKIE, value: '0' }]);

    clearAuthPersistencePreference();
    expect(readDocumentCookie(AUTH_PERSIST_COOKIE)).toBeNull();
  });
});

describe('Supabase cookie lifetime', () => {
  it('matches the @supabase/ssr default maxAge', () => {
    expect(AUTH_PERSIST_MAX_AGE_SECONDS).toBe(400 * 24 * 60 * 60);
  });
});
