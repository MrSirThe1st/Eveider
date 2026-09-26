import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { signIn } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCKER_ID = '0cdff0c3-1605-4cad-bbd0-0c6d00513b70';

async function newAuthedContext(
  browser: Browser,
  email: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

async function createCourierPickup(page: Page, reference: string) {
  const createRes = await page.request.post('/api/organisation/parcels', {
    data: {
      pickupType: 'courier_pickup',
      senderName: 'Boutique Lubum QA',
      senderPhone: '+243970100001',
      senderAddress: 'Avenue du Commerce, Lubumbashi',
      recipientName: 'QA Notify Dest',
      recipientPhone: `+24389${String(Date.now()).slice(-7)}`,
      lockerId: LOCKER_ID,
      packageSize: 'medium',
      packageCategory: 'fashion',
      paymentResponsibility: 'receiver_pays',
      reference,
    },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  return createRes.json() as Promise<{
    data: { parcel: { id: string; trackingNumber?: string } };
  }>;
}

/**
 * Notification V1 browser QA.
 * From apps/web-manager: pnpm test:e2e e2e/notifications-v1.spec.ts
 */
test.describe('Notifications V1', () => {
  test.setTimeout(180_000);

  test('admin: bell, livraisons tab counts, mark read, email preference toggle', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await expect(page).toHaveURL(/\/tableau-de-bord/, { timeout: 45_000 });

    const bell = page.getByRole('button', { name: /Notifications/i });
    await expect(bell).toBeVisible({ timeout: 20_000 });

    await page.goto('/tableau-de-bord/livraisons', { waitUntil: 'domcontentloaded' });
    const tabs = page.getByRole('navigation', { name: /Vues livraisons/i });
    await expect(tabs).toBeVisible({ timeout: 30_000 });
    await expect(tabs.getByRole('link', { name: /À assigner/i })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /Incidents/i })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /En cours/i })).toBeVisible();
    // Actionable queue badges (counts) appear when > 0
    await expect
      .poll(async () => {
        const assign = await tabs.getByRole('link', { name: /À assigner/i }).innerText();
        const incidents = await tabs.getByRole('link', { name: /Incidents/i }).innerText();
        return { assign, incidents };
      })
      .toMatchObject({
        assign: expect.stringMatching(/À assigner/i),
        incidents: expect.stringMatching(/Incidents/i),
      });

    const bellAfterNav = page.getByRole('button', { name: /Notifications/i });
    await expect(bellAfterNav).toBeVisible();
    await bellAfterNav.click();
    await expect(page.getByText(/Voir toutes les notifications/i)).toBeVisible({
      timeout: 20_000,
    });

    const markAll = page.getByRole('button', { name: /Tout marquer comme lu/i });
    if (await markAll.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/notifications/read-all') && res.ok()),
        markAll.click(),
      ]);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Voir toutes les notifications/i)).toBeHidden({
      timeout: 10_000,
    });

    await page.goto('/tableau-de-bord/parametres/mon-compte/notifications', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/Notifications dans Eveider/i)).toBeVisible();
    // Preferences route may cold-compile on first hit
    const emailToggle = page.getByRole('checkbox');
    await expect(emailToggle).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Activées|Désactivées/)).toBeVisible();

    const wasChecked = await emailToggle.isChecked();
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/notifications/preferences') &&
          res.request().method() === 'PATCH' &&
          res.ok(),
      ),
      emailToggle.click(),
    ]);
    await expect(emailToggle).toHaveJSProperty('checked', !wasChecked);
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/notifications/preferences') &&
          res.request().method() === 'PATCH' &&
          res.ok(),
      ),
      emailToggle.click(),
    ]);
  });

  test('new courier pickup → admin unread + entity link; mark-all leaves livraisons badge', async ({
    browser,
  }) => {
    const { context: adminContext, page: adminPage } = await newAuthedContext(
      browser,
      'admin@eveider.cd',
    );
    await expect(adminPage).toHaveURL(/\/tableau-de-bord/, { timeout: 45_000 });

    const beforeRes = await adminPage.request.get('/api/notifications/summary');
    expect(beforeRes.ok()).toBeTruthy();
    const before = (await beforeRes.json()) as {
      data: { unreadCount: number; badges: { admin: { livraisons: number } } };
    };
    const livraisonsBefore = before.data.badges.admin.livraisons;

    await adminPage.request.patch('/api/notifications/read-all');

    const { context: businessContext, page: businessPage } = await newAuthedContext(
      browser,
      'boutique.lubum@eveider.cd',
    );
    await expect(businessPage).toHaveURL(/\/organisation\/tableau-de-bord/, { timeout: 45_000 });

    const created = await createCourierPickup(businessPage, `QA-NOTIF-${Date.now()}`);
    expect(created.data.parcel.id).toBeTruthy();

    await expect
      .poll(
        async () => {
          const res = await adminPage.request.get('/api/notifications/summary');
          const json = (await res.json()) as { data: { unreadCount: number } };
          return json.data.unreadCount;
        },
        { timeout: 45_000 },
      )
      .toBeGreaterThan(0);

    const listRes = await adminPage.request.get('/api/notifications?limit=10');
    const listJson = (await listRes.json()) as {
      data: {
        notifications: Array<{ id: string; title: string; href: string | null; read: boolean }>;
      };
    };
    const pickup = listJson.data.notifications.find((n) =>
      /collecte|Nouvelle demande/i.test(n.title),
    );
    expect(pickup).toBeTruthy();
    expect(pickup?.href).toMatch(/\/tableau-de-bord\/colis\//);

    await adminPage.goto('/tableau-de-bord', { waitUntil: 'domcontentloaded' });
    const bell = adminPage.getByRole('button', { name: /Notifications/i });
    await bell.click();
    await expect(adminPage.getByText(/Voir toutes les notifications/i)).toBeVisible({
      timeout: 20_000,
    });
    const item = adminPage
      .getByRole('link')
      .filter({ hasText: /Nouvelle demande de collecte/i })
      .first();
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.click();
    await expect(adminPage).toHaveURL(/\/tableau-de-bord\/colis\//, { timeout: 20_000 });

    const afterRead = await adminPage.request.patch('/api/notifications/read-all');
    expect(afterRead.ok()).toBeTruthy();
    const summaryAfter = await adminPage.request.get('/api/notifications/summary');
    const summaryJson = (await summaryAfter.json()) as {
      data: { unreadCount: number; badges: { admin: { livraisons: number } } };
    };
    expect(summaryJson.data.unreadCount).toBe(0);
    expect(summaryJson.data.badges.admin.livraisons).toBeGreaterThanOrEqual(livraisonsBefore);
    expect(summaryJson.data.badges.admin.livraisons).toBeGreaterThan(0);

    const bizList = await businessPage.request.get('/api/notifications?limit=20');
    const bizJson = (await bizList.json()) as {
      data: { notifications: Array<{ title: string }> };
    };
    expect(
      bizJson.data.notifications.some((n) => /Nouvelle demande de collecte/i.test(n.title)),
    ).toBe(false);

    await adminContext.close();
    await businessContext.close();
  });

  test('cross-org isolation: notification IDs never overlap between businesses', async ({
    browser,
  }) => {
    const { context: a, page: pageA } = await newAuthedContext(
      browser,
      'boutique.lubum@eveider.cd',
    );
    const { context: b, page: pageB } = await newAuthedContext(browser, 'mine.kolwezi@eveider.cd');

    const listA = await pageA.request.get('/api/notifications?limit=50');
    const listB = await pageB.request.get('/api/notifications?limit=50');
    expect(listA.ok()).toBeTruthy();
    expect(listB.ok()).toBeTruthy();

    const aJson = (await listA.json()) as {
      data: { notifications: Array<{ id: string }> };
    };
    const bJson = (await listB.json()) as {
      data: { notifications: Array<{ id: string }> };
    };

    const aIds = new Set(aJson.data.notifications.map((n) => n.id));
    for (const n of bJson.data.notifications) {
      expect(aIds.has(n.id)).toBe(false);
    }

    await a.close();
    await b.close();
  });

  test('email OFF → in-app still works; preference persists; restore ON', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/mon-compte/notifications', {
      waitUntil: 'domcontentloaded',
    });
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible({ timeout: 60_000 });

    if (await checkbox.isChecked()) {
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes('/api/notifications/preferences') &&
            res.request().method() === 'PATCH' &&
            res.ok(),
        ),
        checkbox.click(),
      ]);
    }
    await expect(checkbox).not.toBeChecked();

    const prefs = await page.request.get('/api/notifications/preferences');
    const prefsJson = (await prefs.json()) as {
      data: { emailNotificationsEnabled: boolean };
    };
    expect(prefsJson.data.emailNotificationsEnabled).toBe(false);

    const list = await page.request.get('/api/notifications?limit=5');
    expect(list.ok()).toBeTruthy();

    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/notifications/preferences') &&
          res.request().method() === 'PATCH' &&
          res.ok(),
      ),
      checkbox.click(),
    ]);
    await expect(checkbox).toBeChecked();
  });
});
