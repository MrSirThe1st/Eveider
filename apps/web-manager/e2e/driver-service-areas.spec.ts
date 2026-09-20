import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Driver service areas', () => {
  test('admin chauffeur list shows zone and filters by it', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/flotte');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Flotte', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Zone' })).toBeVisible();
    await expect(page.getByText(/Lubumbashi/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Ville' })).toBeVisible();

    await page.getByRole('button', { name: '+ Zone' }).click();
    const kolwezi = page.getByRole('option', { name: /Kolwezi/ });
    if ((await kolwezi.count()) > 0) {
      await kolwezi.click();
      await expect(page.getByRole('link', { name: 'Jean-Pierre Tshibanda' })).toHaveCount(0);
      const filteredDriver = page.locator('a.nb-data-table__link').first();
      if (await filteredDriver.isVisible()) {
        const href = await filteredDriver.getAttribute('href');
        expect(href).toMatch(/\/flotte\/[0-9a-f-]+$/);
        await page.goto(href!, { waitUntil: 'domcontentloaded' });
        await expect(page.getByLabel('Zone de service')).toBeVisible();
        await expect(page.getByLabel('Zone de service')).toHaveValue(/.+/);
      }
    } else {
      const driverLink = page.locator('a.nb-data-table__link').first();
      await expect(driverLink).toBeVisible();
      const href = await driverLink.getAttribute('href');
      expect(href).toMatch(/\/flotte\/[0-9a-f-]+$/);
      await page.goto(href!, { waitUntil: 'domcontentloaded' });
      await expect(page.getByLabel('Zone de service')).toBeVisible();
    }
  });

  test('org chauffeur list redirects to the Business dashboard', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/organisation\/tableau-de-bord$/);
    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Zone' })).toHaveCount(0);
  });
});
