import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';
import { ensureOperatingCity, uniqueGeoCode } from './helpers/geo';

test.describe('Admin villes et zones', () => {
  test('hierarchical geography, city/zone create, delete safety, locker filter', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/reseau');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Villes et zones', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kolwezi', exact: true })).toBeVisible();
    await expect(page.getByText('Lualaba').first()).toBeVisible();
    await expect(page.getByText('Dilala').first()).toBeVisible();
    await expect(page.getByText('à répartir')).toHaveCount(0);

    const citySection = await ensureOperatingCity(page, 'Beni', 'Nord-Kivu');
    await expect(page.getByText('à répartir')).toHaveCount(0);

    await citySection.getByRole('button', { name: 'Actions de la ville' }).click();
    await page.getByRole('menuitem', { name: 'Nouvelle zone' }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle zone · Beni' })).toBeVisible();
    await expect(page.getByText(/Non configuré/)).toBeVisible();

    const zoneCode = uniqueGeoCode('Z').slice(0, 6);
    await citySection.getByLabel('Nom', { exact: true }).fill(`Centre ${zoneCode}`);
    await expect(citySection.getByLabel('Code', { exact: true })).toHaveCount(0);
    await citySection.getByRole('button', { name: 'Créer la zone' }).click();
    await expect(page.getByText(`Zone Centre ${zoneCode} créée.`)).toBeVisible();
    await expect(page.getByText(`Centre ${zoneCode}`)).toBeVisible();

    const dilala = page.getByRole('listitem').filter({ hasText: 'Dilala' }).first();
    await dilala.getByRole('button', { name: 'Actions de la ligne' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await expect(page.getByText(/réassignez d’abord/i)).toBeVisible();

    const emptyZone = page.getByRole('listitem').filter({ hasText: `Centre ${zoneCode}` });
    await emptyZone.getByRole('button', { name: 'Actions de la ligne' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await expect(page.getByRole('heading', { name: `Supprimer « Centre ${zoneCode} » ?` })).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText(`Zone Centre ${zoneCode} supprimée.`)).toBeVisible();

    await citySection.getByRole('button', { name: 'Actions de la ville' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await expect(page.getByRole('heading', { name: 'Supprimer Beni ?' })).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Ville Beni supprimée.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Beni', exact: true })).toHaveCount(0);

    await dilala.getByRole('link', { name: /Casiers/ }).click();
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/zoneId=/);
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau casier' })).toBeVisible();
    await expect(page.getByText(/EVEIDER DILALA/i)).toBeVisible();
    await expect(page.getByText(/EVEIDER KAMPEMBA/i)).toHaveCount(0);
  });
});
