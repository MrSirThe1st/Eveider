import {
  THEME_COOKIE_NAME,
  deleteBrowserCookie,
  preferencesAllowed,
  readBrowserConsent,
  readBrowserCookie,
  writeBrowserCookie,
} from '@/lib/consent';

export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

export const THEME_INIT_SCRIPT = `(function(){
  try {
    var el = document.documentElement;
    var existing = el.getAttribute('data-theme');
    if (existing === 'light' || existing === 'dark') {
      el.style.colorScheme = existing;
      return;
    }
    var match = document.cookie.split(';').map(function(part){ return part.trim(); }).find(function(part){ return part.indexOf('${THEME_COOKIE_NAME}=') === 0; });
    var stored = match ? decodeURIComponent(match.slice(${THEME_COOKIE_NAME.length + 1})) : '';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    el.setAttribute('data-theme', theme);
    el.style.colorScheme = theme;
  } catch (e) {}
})();`;

export function readTheme(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function readThemePreference(): ThemePreference {
  if (typeof document === 'undefined') return 'system';
  const stored = readBrowserCookie(THEME_COOKIE_NAME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function resolvedTheme(preference: ThemePreference): ThemeName {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function persistThemeCookie(theme: ThemePreference) {
  writeBrowserCookie(THEME_COOKIE_NAME, theme);
  try {
    window.localStorage.removeItem('eveider.theme');
  } catch {
    /* ignore */
  }
}

export function clearThemeCookie() {
  deleteBrowserCookie(THEME_COOKIE_NAME);
}

export function persistThemeIfAllowed(theme: ThemePreference = readTheme()) {
  if (preferencesAllowed(readBrowserConsent())) {
    persistThemeCookie(theme);
  } else {
    clearThemeCookie();
  }
}

export function applyTheme(theme: ThemeName) {
  applyThemePreference(theme);
}

export function applyThemePreference(preference: ThemePreference) {
  const theme = resolvedTheme(preference);
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  persistThemeIfAllowed(preference);
  window.dispatchEvent(new Event('eveider:theme-preference'));
}

export function toggleTheme(): ThemeName {
  const next: ThemeName = readTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.addEventListener('eveider:theme-preference', onStoreChange);
  return () => {
    observer.disconnect();
    window.removeEventListener('eveider:theme-preference', onStoreChange);
  };
}

export function migrateLegacyThemeStorage() {
  if (!preferencesAllowed(readBrowserConsent())) return;
  if (readBrowserCookie(THEME_COOKIE_NAME)) return;
  try {
    const legacy = window.localStorage.getItem('eveider.theme');
    if (legacy === 'light' || legacy === 'dark') {
      persistThemeCookie(legacy);
    }
  } catch {
    /* ignore */
  }
}
