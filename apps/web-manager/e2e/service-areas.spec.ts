import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin service areas', () => {
  test('zones CRUD surface and points filter by zone', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/casiers/zones');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Nouvelle zone' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer la zone' })).toBeDisabled();

    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const code = `T${suffix}`.slice(0, 6);
    await page.getByLabel('Code', { exact: true }).fill(code);
    await page.getByLabel('Nom', { exact: true }).fill(`Test ${code}`);
    await page.getByLabel('Ville').selectOption('Goma');
    await page.getByRole('button', { name: 'Créer la zone' }).click();

    await expect(page.getByText(`Zone Test ${code} créée.`)).toBeVisible();
    await expect(page.getByText(`Test ${code} (${code})`)).toBeVisible();

    const card = page.locator('article').filter({ hasText: `(${code})` });
    await card.getByRole('button', { name: 'Archiver' }).click();
    await expect(page.getByText('Zone archivée.')).toBeVisible();

    await page.goto('/tableau-de-bord/points');
    await dismissCookieBanner(page);
    await expect(page.getByRole('heading', { name: 'Points', level: 1 })).toBeVisible();

    const zoneFilter = page.getByLabel('Filtrer par zone de service');
    await expect(zoneFilter).toBeVisible();
    await zoneFilter.selectOption({ label: 'Kolwezi (Kolwezi)' });
    await expect(page.getByText(/3 points sur \d+/)).toBeVisible();
    await expect(page.getByRole('link', { name: /EVEIDER DILALA/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /EVEIDER KAMPEMBA/i })).toHaveCount(0);
  });
});
