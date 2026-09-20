import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Organisation API settings', () => {
  test.describe.configure({ timeout: 90_000 });
  test('Boutique Kenya can create an access key', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/parametres/api');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'API', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Clé d.accès/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Adresse de notification' })).toBeVisible();

    if ((await page.getByRole('button', { name: 'Révoquer' }).count()) >= 5) {
      await page.getByRole('button', { name: 'Révoquer' }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Révoquer' }).click();
      await expect(dialog).toBeHidden();
    }

    await page.getByLabel('Nom (facultatif)').fill('Logiciel caisse');
    await page.getByRole('button', { name: 'Créer une clé' }).click();

    await expect(page.getByText(/ne sera plus affichée/)).toBeVisible();
    await expect(page.getByText(/eveider_live_/).first()).toBeVisible();
    await expect(page.getByText('Logiciel caisse')).toBeVisible();
  });
});
