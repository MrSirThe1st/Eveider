import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin data tables', () => {
  test('casiers table sorts, paginates, and keeps row actions', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /Rechercher un casier/ })).toBeVisible();
    const nameHeader = page.getByRole('columnheader', { name: /Casier/ });
    await expect(nameHeader).toBeVisible();
    await expect(nameHeader.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Trier' })).toBeVisible();
    await expect(page.getByText(/\d+[–-]\d+ sur \d+/)).toBeVisible();
    await expect(page.getByLabel('Nombre de lignes par page')).toBeVisible();

    const details = page.getByRole('link', { name: 'Détails' }).first();
    await expect(details).toBeVisible();
    await details.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/[0-9a-f-]+$/);
  });

  test('flotte table keeps search and opens a driver from the row action', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/flotte');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Flotte', level: 1 })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Rechercher un chauffeur' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Chauffeur/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trier' })).toBeVisible();
    const details = page.getByRole('link', { name: 'Détails' }).first();
    await expect(details).toBeVisible();
    await details.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/flotte\/[0-9a-f-]+$/);
  });

  test('colis toolbar keeps search and an icon export', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/colis');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Colis', level: 1 })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /Rechercher un colis/ })).toBeVisible();

    await page.getByRole('button', { name: 'Exporter' }).click();
    await expect(page.getByRole('menuitem', { name: 'Exporter (filtres)' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Exporter tout' })).toBeVisible();
  });
});
