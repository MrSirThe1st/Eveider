import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Organisation API settings', () => {
  test('Boutique Kenya can create an access key', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/parametres/api');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'API', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Clé d.accès/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Adresse de notification' })).toBeVisible();

    await page.getByLabel('Nom (facultatif)').fill('Logiciel caisse');
    await page.getByRole('button', { name: 'Créer une clé' }).click();

    await expect(page.getByText(/eveider_live_/)).toBeVisible();
    await expect(page.getByText(/ne sera plus affichée/)).toBeVisible();
    await expect(page.getByText('Logiciel caisse')).toBeVisible();
  });
});
