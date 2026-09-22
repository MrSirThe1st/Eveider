import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';
import { ensureOperatingCity, uniqueGeoCode } from './helpers/geo';

test.describe('Admin tarifs geography', () => {
  test('persists Non configuré, Gratuit, and priced amounts without coercing NULL to 0', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/reseau');
    await dismissCookieBanner(page);

    const cityName = 'Kasumbalesa';
    const zoneCode = uniqueGeoCode('Z');
    const zoneName = `Centre ${zoneCode}`;

    const citySection = await ensureOperatingCity(page, cityName, 'Haut-Katanga');
    await citySection.getByRole('button', { name: 'Actions de la ville' }).click();
    await page.getByRole('menuitem', { name: 'Nouvelle zone' }).click();
    await citySection.getByLabel('Nom', { exact: true }).fill(zoneName);
    await expect(citySection.getByLabel('Code', { exact: true })).toHaveCount(0);
    await citySection.getByRole('button', { name: 'Créer la zone' }).click();
    await expect(page.getByText(`Zone ${zoneName} créée.`)).toBeVisible();

    await page.goto('/tableau-de-bord/parametres/facturation');
    await expect(page.getByRole('heading', { name: 'Tarifs', level: 1 })).toBeVisible();
    await expect(page.getByText('distance × taille')).toHaveCount(0);
    await expect(page.getByText(/Flow 2|Flow 3B/)).toHaveCount(0);
    await expect(page.getByText(/^Devise :/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Modifier' })).toBeVisible();
    await expect(page.getByLabel('Retrait au casier')).toBeVisible();
    await expect(page.getByLabel('Retrait d’un retour par l’entreprise')).toBeVisible();

    const citySummary = page.locator('summary').filter({ hasText: cityName });
    const openCity = async () => {
      const details = page.locator('details').filter({ hasText: cityName });
      if ((await details.getAttribute('open')) === null) {
        await citySummary.click();
      }
    };
    await openCity();

    const outbound = page.getByLabel(`Livraison ${zoneName}`);
    const ret = page.getByLabel(`Retour vers l’entreprise ${zoneName}`);
    await expect(outbound).toHaveValue('');
    await expect(ret).toHaveValue('');
    await expect(page.getByText(/tarif non configuré/i)).toBeVisible();

    await outbound.fill('2500');
    await ret.fill('0');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Tarifs mis à jour')).toBeVisible();

    await page.reload();
    await openCity();
    await expect(page.getByLabel(`Livraison ${zoneName}`)).toHaveValue('2500');
    await expect(page.getByLabel(`Retour vers l’entreprise ${zoneName}`)).toHaveValue('0');

    await page.getByLabel(`Livraison ${zoneName}`).fill('');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Tarifs mis à jour')).toBeVisible();

    await page.reload();
    await openCity();
    await expect(page.getByLabel(`Livraison ${zoneName}`)).toHaveValue('');
    await expect(page.getByLabel(`Retour vers l’entreprise ${zoneName}`)).toHaveValue('0');
  });
});
