import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  hasAnsweredConsent,
  parseConsent,
  readBrowserConsent,
  writeBrowserConsent,
} from './consent.js';

describe('cookie consent persistence', () => {
  const cookieJar = new Map<string, string>();

  beforeEach(() => {
    cookieJar.clear();
    vi.stubGlobal('document', {
      get cookie() {
        return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      },
      set cookie(value: string) {
        const [pair] = value.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq).trim();
        const raw = pair.slice(eq + 1).trim();
        if (value.includes('Max-Age=0')) {
          cookieJar.delete(name);
          return;
        }
        cookieJar.set(name, raw);
      },
    });
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal('location', { protocol: 'http:' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses accept and refuse decisions', () => {
    expect(
      parseConsent(JSON.stringify({ v: 1, preferences: true, updatedAt: '2026-01-01T00:00:00.000Z' })),
    ).toMatchObject({ preferences: true });
    expect(
      parseConsent(JSON.stringify({ v: 1, preferences: false, updatedAt: '2026-01-01T00:00:00.000Z' })),
    ).toMatchObject({ preferences: false });
    expect(parseConsent(JSON.stringify({ v: 2, preferences: true }))).toBeNull();
    expect(hasAnsweredConsent(null)).toBe(false);
  });

  it('persists consent to cookie and localStorage', () => {
    writeBrowserConsent({
      v: 1,
      preferences: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(cookieJar.has(CONSENT_COOKIE_NAME)).toBe(true);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toContain('"preferences":true');
    expect(readBrowserConsent()?.preferences).toBe(true);
  });

  it('recovers from localStorage when the cookie is missing', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ v: 1, preferences: false, updatedAt: '2026-01-01T00:00:00.000Z' }),
    );
    const consent = readBrowserConsent();
    expect(consent?.preferences).toBe(false);
    expect(cookieJar.has(CONSENT_COOKIE_NAME)).toBe(true);
  });
});
