import { expect, test } from '@playwright/test';
import { dismissCookieBanner } from './helpers/auth';

test.describe('Public tracking /suivi', () => {
  test.describe.configure({ timeout: 90_000 });

  test('guest tracking stays usable without an account', async ({ page }) => {
    await page.goto('/suivi');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Suivre votre colis' })).toBeVisible();
    await expect(page.getByText('Aucun compte requis')).toBeVisible();
    await expect(page.getByText('N° DE SUIVI')).toBeVisible();
    await expect(page.getByText('Qui paie')).toHaveCount(0);
    await expect(page.getByText('Coursier')).toHaveCount(0);
    await expect(page.getByText('Livré au point')).toHaveCount(0);
  });
});
