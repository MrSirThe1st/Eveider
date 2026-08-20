import {
  THEME_COOKIE_NAME,
  deleteBrowserCookie,
  preferencesAllowed,
  readBrowserConsent,
  readBrowserCookie,
  writeBrowserCookie,
} from '@/lib/consent';

export type ThemeName = 'light' | 'dark';

export const THEME_INIT_SCRIPT = `(function(){
  try {
    var el = document.documentElement;
    var existing = el.getAttribute('data-theme');
    if (existing === 'light' || existing === 'dark') {
      el.style.colorScheme = existing;
      return;
    }
    var match = document.cookie.split('; ').find(function(part){ return part.indexOf('${THEME_COOKIE_NAME}=') === 0; });
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

function persistThemeCookie(theme: ThemeName) {
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

export function persistThemeIfAllowed(theme: ThemeName = readTheme()) {
  if (preferencesAllowed(readBrowserConsent())) {
    persistThemeCookie(theme);
  } else {
    clearThemeCookie();
  }
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  persistThemeIfAllowed(theme);
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
  return () => observer.disconnect();
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
