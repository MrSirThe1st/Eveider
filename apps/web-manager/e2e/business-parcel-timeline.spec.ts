import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Business Colis Historique', () => {
  test('org parcel detail shows event timeline section', async ({ page }) => {
    await signIn(page, 'mine.kolwezi@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/colis/67f1799c-692f-4232-935e-07b3e1d941d5');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
    await expect(
      page.getByText('Comment ce colis est arrivé à son statut actuel.'),
    ).toBeVisible();
    await expect(page.getByText('Aucun événement enregistré pour ce colis.')).toHaveCount(0);
    await expect(page.locator('ol li').first()).toBeVisible();
  });
});
