import { expect, type Browser, type Page } from '@playwright/test';

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'EveiderDemo2026!';

export async function seedConsentCookie(page: Page) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
  const host = new URL(baseURL).hostname;
  const value = JSON.stringify({
    v: 1,
    preferences: false,
    updatedAt: new Date().toISOString(),
  });
  await page.route(/tawk\.to/i, (route) => route.abort());
  await page.context().addCookies([
    {
      name: 'eveider_cookie_consent',
      value,
      domain: host,
      path: '/',
    },
  ]);
  await page.addInitScript((payload) => {
    try {
      window.localStorage.setItem('eveider.cookie_consent', payload);
    } catch {
      /* ignore */
    }
    const style = document.createElement('style');
    style.textContent =
      'iframe[title="Chat widget"], iframe[src*="tawk.to"], div[id^="tawk"] { display: none !important; pointer-events: none !important; }';
    document.documentElement.appendChild(style);
  }, value);
}

export async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: /^Accepter$/i });
  if (await accept.isVisible({ timeout: 1000 }).catch(() => false)) {
    await accept.click();
  }
}

export async function signIn(
  page: Page,
  email: string,
  password = SEED_PASSWORD,
  options: { remember?: boolean } = {},
) {
  await seedConsentCookie(page);
  await page.goto('/connexion', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible({ timeout: 45_000 });

  const form = page.locator('form[data-ready="true"]');
  const hydrated = await form.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!hydrated) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible({ timeout: 45_000 });
  }
  await expect(form).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled({ timeout: 45_000 });
  await dismissCookieBanner(page);

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);

  const rememberBox = page.getByRole('checkbox', { name: 'Se souvenir de moi' });
  if (options.remember) {
    await rememberBox.check();
  } else if (options.remember === false) {
    await rememberBox.uncheck();
  }

  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/connexion'), { timeout: 45_000 });
}

export function isAuthTokenCookie(cookie: { name: string }) {
  return cookie.name.includes('-auth-token');
}

export function isSessionCookie(cookie: { expires: number }) {
  return cookie.expires === -1;
}

export async function reopenWithPersistentCookies(page: Page, browser: Browser) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
  const persistent = (await page.context().cookies()).filter((cookie) => cookie.expires !== -1);
  const context = await browser.newContext({ baseURL });
  if (persistent.length > 0) {
    await context.addCookies(persistent);
  }
  const nextPage = await context.newPage();
  await seedConsentCookie(nextPage);
  return { context, page: nextPage };
}
