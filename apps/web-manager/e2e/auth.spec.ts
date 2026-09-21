import { expect, test, type Page } from '@playwright/test';
import {
  SEED_PASSWORD,
  dismissCookieBanner,
  isAuthTokenCookie,
  isSessionCookie,
  reopenWithPersistentCookies,
  signIn,
} from './helpers/auth';

async function expectPasswordNotStored(page: Page, password: string) {
  const stored = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(JSON.stringify(stored)).not.toContain(password);
  expect(stored.local['eveider.rememberEmail']).toBeUndefined();
}

async function expectLoggedIn(page: Page) {
  await expect(page).toHaveURL(/\/tableau-de-bord/);
  await expect(page.getByRole('heading', { name: 'Tableau de bord', level: 1 })).toBeVisible();
}

async function signOutToPublic(page: Page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForURL((url) => url.pathname === '/' || url.pathname.startsWith('/connexion'), {
    timeout: 20_000,
  });
  await page.goto('/tableau-de-bord');
  await expect(page).toHaveURL(/\/connexion/);
}

test.describe('Authentication', () => {
  test('admin login establishes a session, reaches the dashboard, and logout returns to public', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await dismissCookieBanner(page);

    await expect(page).not.toHaveURL(/\/connexion/);
    await expectLoggedIn(page);

    await page.goto('/tableau-de-bord/casiers');
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers/);
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();

    await signOutToPublic(page);
  });

  test('remember me checked keeps the session after a browser restart', async ({
    page,
    browser,
  }) => {
    await signIn(page, 'admin@eveider.cd', SEED_PASSWORD, { remember: true });
    await dismissCookieBanner(page);
    await expectLoggedIn(page);
    await expectPasswordNotStored(page, SEED_PASSWORD);

    const authCookies = (await page.context().cookies()).filter(isAuthTokenCookie);
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.every((cookie) => !isSessionCookie(cookie))).toBe(true);

    const { context, page: restarted } = await reopenWithPersistentCookies(page, browser);
    try {
      await restarted.goto('/tableau-de-bord');
      await expectLoggedIn(restarted);
      await expectPasswordNotStored(restarted, SEED_PASSWORD);
      await signOutToPublic(restarted);
    } finally {
      await context.close();
    }
  });

  test('remember me unchecked drops the session after a browser restart', async ({
    page,
    browser,
  }) => {
    await signIn(page, 'admin@eveider.cd', SEED_PASSWORD, { remember: false });
    await dismissCookieBanner(page);
    await expectLoggedIn(page);
    await expectPasswordNotStored(page, SEED_PASSWORD);

    const authCookies = (await page.context().cookies()).filter(isAuthTokenCookie);
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.every(isSessionCookie)).toBe(true);

    await page.reload();
    await expectLoggedIn(page);
    await page.goto('/tableau-de-bord/casiers');
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();

    const { context, page: restarted } = await reopenWithPersistentCookies(page, browser);
    try {
      await restarted.goto('/tableau-de-bord');
      await expect(restarted).toHaveURL(/\/connexion/);
    } finally {
      await context.close();
    }
  });

  test('logout clears a remembered session', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd', SEED_PASSWORD, { remember: true });
    await dismissCookieBanner(page);
    await expectLoggedIn(page);
    await signOutToPublic(page);
  });
});
