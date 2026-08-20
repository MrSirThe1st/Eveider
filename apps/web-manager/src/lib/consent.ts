export const CONSENT_COOKIE_NAME = 'eveider_cookie_consent';
export const THEME_COOKIE_NAME = 'eveider_theme';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const CONSENT_VERSION = 1;
export const COOKIE_SETTINGS_EVENT = 'eveider:open-cookie-settings';

export type CookieConsent = {
  v: number;
  preferences: boolean;
  updatedAt: string;
};

export function parseConsent(raw: string | undefined | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.v !== CONSENT_VERSION || typeof parsed.preferences !== 'boolean') {
      return null;
    }
    return {
      v: CONSENT_VERSION,
      preferences: parsed.preferences,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeConsent(consent: CookieConsent): string {
  return JSON.stringify(consent);
}

export function hasAnsweredConsent(consent: CookieConsent | null): boolean {
  return consent !== null;
}

export function preferencesAllowed(consent: CookieConsent | null): boolean {
  return consent?.preferences === true;
}

export function parseTheme(raw: string | undefined | null): 'light' | 'dark' | null {
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export function cookieAttributeString(maxAge = COOKIE_MAX_AGE_SECONDS): string {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function writeBrowserCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttributeString(maxAge)}`;
}

export function deleteBrowserCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readBrowserConsent(): CookieConsent | null {
  return parseConsent(readBrowserCookie(CONSENT_COOKIE_NAME));
}

export function writeBrowserConsent(consent: CookieConsent) {
  writeBrowserCookie(CONSENT_COOKIE_NAME, serializeConsent(consent));
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

export function subscribeCookieSettings(onOpen: () => void): () => void {
  window.addEventListener(COOKIE_SETTINGS_EVENT, onOpen);
  return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpen);
}
