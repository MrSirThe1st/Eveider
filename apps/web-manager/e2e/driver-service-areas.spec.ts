import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Driver service areas', () => {
  test('admin chauffeur list shows zone and filters by it', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Zone' })).toBeVisible();
    await expect(page.getByText('Lubumbashi').first()).toBeVisible();
    await expect(page.getByText('Kolwezi').first()).toBeVisible();

    await page.getByRole('button', { name: '+ Zone' }).click();
    await page.getByRole('option', { name: 'Kolwezi' }).click();
    const michel = page.getByRole('link', { name: 'Michel Kabwe' });
    await expect(michel).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jean-Pierre Tshibanda' })).toHaveCount(0);

    const href = await michel.getAttribute('href');
    expect(href).toMatch(/\/chauffeurs\/[0-9a-f-]+$/);
    await page.goto(href!);
    await expect(page.getByLabel('Zone de service')).toBeVisible();
    await expect(page.getByLabel('Zone de service')).toHaveValue(/.+/);
  });

  test('org chauffeur list shows zone column', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Zone' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jean-Pierre Tshibanda' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Lubumbashi' }).first()).toBeVisible();
  });
});
