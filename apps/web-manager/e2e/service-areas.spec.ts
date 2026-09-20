import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin villes et zones', () => {
  test('hierarchical geography, city/zone create, archive safety, locker filter', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/casiers/zones');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Villes et zones', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kolwezi', exact: true })).toBeVisible();
    await expect(page.getByText('Kolwezi — à répartir').first()).toBeVisible();
    await expect(page.getByText('Lubumbashi — à répartir').first()).toBeVisible();

    await page.getByRole('button', { name: 'Nouvelle ville' }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle ville' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer la ville' })).toBeDisabled();

    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const cityCode = `G${suffix}`.slice(0, 6);
    await page.getByLabel('Code', { exact: true }).fill(cityCode);
    await page.getByLabel('Nom', { exact: true }).fill(`Goma ${cityCode}`);
    await page.getByRole('button', { name: 'Créer la ville' }).click();
    await expect(page.getByText(`Ville Goma ${cityCode} créée.`)).toBeVisible();

    const citySection = page.locator('section').filter({ has: page.getByRole('heading', { name: `Goma ${cityCode}` }) });
    await citySection.getByRole('button', { name: 'Nouvelle zone' }).click();
    await expect(page.getByRole('heading', { name: `Nouvelle zone · Goma ${cityCode}` })).toBeVisible();
    await expect(page.getByText(/Non configuré/)).toBeVisible();

    const zoneCode = `Z${suffix}`.slice(0, 6);
    await citySection.getByLabel('Nom', { exact: true }).fill(`Centre ${zoneCode}`);
    await citySection.getByLabel('Code', { exact: true }).fill(zoneCode);
    await citySection.getByRole('button', { name: 'Créer la zone' }).click();
    await expect(page.getByText(`Zone Centre ${zoneCode} créée.`)).toBeVisible();
    await expect(page.getByText(`Centre ${zoneCode}`)).toBeVisible();

    const holding = page.locator('article').filter({ hasText: 'Kolwezi — à répartir' }).first();
    await holding.getByRole('button', { name: 'Archiver' }).click();
    await expect(page.getByText(/réassignez d’abord/i)).toBeVisible();

    const emptyZone = page.locator('article').filter({ hasText: zoneCode });
    await emptyZone.getByRole('button', { name: 'Archiver' }).click();
    await expect(page.getByText('Zone archivée.')).toBeVisible();

    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau casier' })).toBeVisible();

    await page.getByRole('button', { name: '+ Ville' }).click();
    await page.getByRole('option', { name: 'Kolwezi', exact: true }).click();
    await page.getByRole('button', { name: '+ Zone' }).click();
    await page.getByRole('option', { name: 'Kolwezi — à répartir' }).click();
    await expect(page.getByText(/3 casiers sur \d+/)).toBeVisible();
    await expect(page.getByText(/EVEIDER DILALA/i)).toBeVisible();
    await expect(page.getByText(/EVEIDER KAMPEMBA/i)).toHaveCount(0);
  });
});
