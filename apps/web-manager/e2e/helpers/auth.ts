import type { Page } from '@playwright/test';

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'EveiderDemo2026!';

export async function seedConsentCookie(page: Page) {
  const value = encodeURIComponent(
    JSON.stringify({
      v: 1,
      preferences: false,
      updatedAt: new Date().toISOString(),
    }),
  );
  await page.context().addCookies([
    {
      name: 'eveider_cookie_consent',
      value,
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
}

export async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: /Accepter/i });
  if (await accept.isVisible({ timeout: 1000 }).catch(() => false)) {
    await accept.click();
  }
}

export async function signIn(page: Page, email: string, password = SEED_PASSWORD) {
  await seedConsentCookie(page);
  await page.goto('/connexion');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/connexion'), { timeout: 60_000 });
}
