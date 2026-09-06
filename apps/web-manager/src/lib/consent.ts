export const CONSENT_COOKIE_NAME = 'eveider_cookie_consent';
export const CONSENT_STORAGE_KEY = 'eveider.cookie_consent';
export const THEME_COOKIE_NAME = 'eveider_theme';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const CONSENT_VERSION = 1;
/** Re-opens the Accept / Refuse banner (footer “Gérer les cookies”). */
export const COOKIE_SETTINGS_EVENT = 'eveider:open-cookie-settings';

export type CookieConsent = {
  v: number;
  /** true = accepted preference cookies; false = refused them. */
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

export function parseTheme(raw: string | undefined | null): 'light' | 'dark' | 'system' | null {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null;
}

export function cookieAttributeString(maxAge = COOKIE_MAX_AGE_SECONDS): string {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  return `Path=/; Max-Age=${maxAge}; Expires=${expires}; SameSite=Lax${secure}`;
}

export function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return match.slice(prefix.length);
  }
}

export function writeBrowserCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttributeString(maxAge)}`;
}

export function deleteBrowserCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function readStorageConsent(): CookieConsent | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStorageConsent(consent: CookieConsent) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(consent));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Read persisted consent. Cookie is primary; localStorage is a backup so the
 * decision survives if the browser drops the first-party cookie.
 * Only re-writes the cookie when recovering from storage (never on a normal hit).
 */
export function readBrowserConsent(): CookieConsent | null {
  const fromCookie = parseConsent(readBrowserCookie(CONSENT_COOKIE_NAME));
  if (fromCookie) return fromCookie;

  const fromStorage = readStorageConsent();
  if (fromStorage) {
    writeBrowserCookie(CONSENT_COOKIE_NAME, serializeConsent(fromStorage));
    return fromStorage;
  }
  return null;
}

export function writeBrowserConsent(consent: CookieConsent) {
  writeBrowserCookie(CONSENT_COOKIE_NAME, serializeConsent(consent));
  writeStorageConsent(consent);
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

export function subscribeCookieSettings(onOpen: () => void): () => void {
  window.addEventListener(COOKIE_SETTINGS_EVENT, onOpen);
  return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpen);
}
