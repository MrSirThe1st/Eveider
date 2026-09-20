import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin casiers network', () => {
  test('overview has no embedded create and nouveau requires an explicit zone', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau casier' })).toBeVisible();
    await expect(page.getByText('Automatique (selon la ville)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Ville' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Zone' })).toBeVisible();

    await page.getByRole('link', { name: 'Nouveau casier' }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/nouveau$/);
    await expect(page.getByRole('heading', { name: 'Nouveau casier', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Ville')).toBeVisible();
    await expect(page.getByLabel('Zone')).toBeVisible();
    await expect(page.getByText('Automatique (selon la ville)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toBeDisabled();

    await page.getByLabel('Ville').selectOption({ label: 'Kolwezi' });
    const zoneSelect = page.getByLabel('Zone');
    await expect(zoneSelect).toBeEnabled();
    const zoneLabels = await zoneSelect.locator('option').allTextContents();
    expect(zoneLabels.some((label) => /Lubumbashi/i.test(label))).toBe(false);
    expect(zoneLabels.some((label) => /Kolwezi/i.test(label))).toBe(true);
    expect(zoneSelect).toHaveValue('');
  });

  test('locker detail keeps historical pricing copy and same-city reassignment', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    const lockerLink = page.getByRole('link', { name: /EVEIDER DILALA/i }).first();
    await expect(lockerLink).toBeVisible();
    await lockerLink.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/[0-9a-f-]+$/);
    await expect(page.getByText(/Les colis déjà créés conservent leur tarif enregistré/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers une autre ville' })).toBeVisible();
    await expect(page.getByLabel('Zone de service')).toBeVisible();
  });
});
