import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin tarifs geography', () => {
  test('shows unconfigured vs free and groups by city', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/facturation');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Tarifs de livraison', level: 1 })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Livraison Eveider par zone' })).toBeVisible();
    await expect(page.getByText('distance × taille')).toHaveCount(0);
    await expect(page.getByLabel('Flow 2 / retrait destinataire')).toBeVisible();
    await expect(page.getByLabel('Flow 3B / retrait retour par entreprise')).toBeVisible();

    const outbound = page.getByLabel(/Livraison destinataire Kolwezi — à répartir/);
    await expect(outbound).toBeVisible();
    const value = await outbound.inputValue();
    if (value === '') {
      await expect(page.getByText('Non configuré').first()).toBeVisible();
    } else if (value === '0') {
      await expect(page.getByText(/Gratuit \(0 CDF\)/).first()).toBeVisible();
    }

    await outbound.fill('');
    await expect(outbound).toHaveValue('');
    await outbound.fill('0');
    await expect(outbound).toHaveValue('0');
  });
});
