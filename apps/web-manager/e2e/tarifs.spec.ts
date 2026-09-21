import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';
import { uniqueGeoCode } from './helpers/geo';

test.describe('Admin tarifs geography', () => {
  test('persists Non configuré, Gratuit, and priced amounts without coercing NULL to 0', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/casiers/zones');
    await dismissCookieBanner(page);

    const suffix = uniqueGeoCode('T');
    const cityCode = suffix.slice(0, 6);
    const cityName = `Tarif ${cityCode}`;
    const zoneCode = uniqueGeoCode('Z');
    const zoneName = `Centre ${zoneCode}`;

    await page.getByRole('button', { name: 'Nouvelle ville' }).click();
    await page.getByLabel('Code', { exact: true }).fill(cityCode);
    await page.getByLabel('Nom', { exact: true }).fill(cityName);
    await page.getByRole('button', { name: 'Créer la ville' }).click();
    await expect(page.getByText(`Ville ${cityName} créée.`)).toBeVisible();

    const citySection = page.locator('section').filter({ has: page.getByRole('heading', { name: cityName }) });
    await citySection.getByRole('button', { name: 'Nouvelle zone' }).click();
    await citySection.getByLabel('Nom', { exact: true }).fill(zoneName);
    await citySection.getByLabel('Code', { exact: true }).fill(zoneCode);
    await citySection.getByRole('button', { name: 'Créer la zone' }).click();
    await expect(page.getByText(`Zone ${zoneName} créée.`)).toBeVisible();

    await page.goto('/tableau-de-bord/parametres/facturation');
    await expect(page.getByRole('heading', { name: 'Tarifs de livraison', level: 1 })).toBeVisible();
    await expect(page.getByText('distance × taille')).toHaveCount(0);
    await expect(page.getByText(/Devise plateforme/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Modifier dans Règles générales' })).toBeVisible();
    await expect(page.getByLabel('Flow 2 / retrait destinataire')).toBeVisible();
    await expect(page.getByLabel('Flow 3B / retrait retour par entreprise')).toBeVisible();

    const outbound = page.getByLabel(`Livraison destinataire ${zoneName}`);
    const ret = page.getByLabel(`Retour Eveider ${zoneName}`);
    await expect(outbound).toHaveValue('');
    await expect(ret).toHaveValue('');
    await expect(page.getByText('Non configuré').first()).toBeVisible();

    await outbound.fill('2500');
    await ret.fill('0');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Tarifs mis à jour')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(`Livraison destinataire ${zoneName}`)).toHaveValue('2500');
    await expect(page.getByLabel(`Retour Eveider ${zoneName}`)).toHaveValue('0');
    await expect(page.getByText(/Gratuit \(0/).first()).toBeVisible();

    await page.getByLabel(`Livraison destinataire ${zoneName}`).fill('');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Tarifs mis à jour')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(`Livraison destinataire ${zoneName}`)).toHaveValue('');
    await expect(page.getByLabel(`Retour Eveider ${zoneName}`)).toHaveValue('0');
  });
});
