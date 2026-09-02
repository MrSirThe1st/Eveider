import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Return leg', () => {
  test('admin Colis detail offers Créer un retour for a parcel at the point', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    const response = await page.request.get('/api/parcels?search=LSH-1001');
    const result = await response.json();
    expect(result.success).toBe(true);
    const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'LSH-1001',
    );
    expect(parcel).toBeTruthy();
    await page.goto(`/tableau-de-bord/colis/${parcel!.id}`);
    await dismissCookieBanner(page);

    await expect(page.getByText('Créer un retour vers le marchand')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer un retour' })).toBeDisabled();
  });

  test('org Colis detail offers Créer un retour for a parcel at the point', async ({
    page,
  }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/colis');
    await dismissCookieBanner(page);

    await page.getByLabel('Rechercher un colis').fill('LSH-1001');
    await expect(page.getByText('Réf. LSH-1001')).toBeVisible();
    await page.locator('a.nb-data-table__link').filter({ hasText: /EVD/ }).first().click();

    await expect(page.getByRole('heading', { name: 'Créer un retour' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer le retour' })).toBeDisabled();
  });
});
