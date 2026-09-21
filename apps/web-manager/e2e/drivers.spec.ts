import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Organization drivers', () => {
  test('org chauffeur pages redirect to the Business dashboard', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/organisation\/tableau-de-bord$/);
    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toHaveCount(0);
    await expect(page.getByTestId('business-drivers-header-add')).toHaveCount(0);
  });

  test('add driver page redirects to the Business dashboard', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs/nouveau');
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/organisation\/tableau-de-bord$/);
    await expect(page.getByLabel('Nom complet')).toHaveCount(0);
  });
});

test.describe('Admin drivers', () => {
  test('list shows Eveider fleet and opens driver details', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/flotte');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Flotte', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Entreprise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un chauffeur' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Rechercher un chauffeur' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Entreprise' })).toBeVisible();

    await expect(page.getByText('Flotte Eveider').first()).toBeVisible();
    await expect(page.getByText('Boutique Kenya')).toHaveCount(0);

    const driverLink = page.locator('a.nb-data-table__link').first();
    await expect(driverLink).toBeVisible();
    const driverName = (await driverLink.innerText()).trim().split('\n')[0]?.trim() ?? '';
    await driverLink.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/flotte\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: driverName, level: 1 })).toBeVisible();
    await expect(page.getByText('Flotte Eveider').first()).toBeVisible();

    const tabs = page.getByRole('navigation', { name: 'Sections chauffeur' });
    await expect(tabs.getByRole('link', { name: 'Aperçu' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Livraisons' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Documents' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Activité' })).toHaveCount(0);

    await expect(page.getByText('Identité')).toBeVisible();
    await expect(page.getByText('Organisation', { exact: true })).toBeVisible();

    await tabs.getByRole('link', { name: 'Livraisons' }).click();
    await expect(page).toHaveURL(/\/livraisons$/);

    await tabs.getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByRole('heading', { name: 'Documents chauffeur' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bloquer' })).toBeVisible();
  });

  test('add driver opens in a popup on the fleet list', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/flotte');
    await dismissCookieBanner(page);

    await expect(page.getByLabel('Nom complet')).toHaveCount(0);

    await page.getByRole('button', { name: 'Ajouter un chauffeur' }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/flotte$/);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Ajouter un chauffeur' })).toBeVisible();
    await expect(dialog.getByText('Flotte Eveider uniquement')).toBeVisible();
    await expect(dialog.getByLabel('Nom complet')).toBeVisible();
    await expect(dialog.getByText('Pièce d’identité', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Choisissez un fichier ou déposez-le ici')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Parcourir' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Ajouter et inviter' })).toBeVisible();
    const zoneSelect = dialog.getByLabel('Zone de service');
    await expect(zoneSelect).toBeVisible();
    const labels = await zoneSelect.locator('option').allTextContents();
    expect(labels.some((label) => /Non assignée/i.test(label))).toBe(true);
    expect(labels.some((label) => /Kolwezi/i.test(label))).toBe(true);
    expect(labels.some((label) => /Lubumbashi/i.test(label))).toBe(true);
    await expect(zoneSelect).toHaveValue('');

    const couriers = await page.request.get('/api/couriers');
    const courierJson = await couriers.json();
    expect(courierJson.success).toBe(true);
    const names = (courierJson.data.couriers as Array<{ fullName: string | null }>).map(
      (courier) => courier.fullName ?? '',
    );
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((name) => /Jean-Pierre Tshibanda/i.test(name))).toBe(true);

    const board = await page.request.get('/api/deliveries/board?includeMeta=true');
    const boardJson = await board.json();
    expect(boardJson.success).toBe(true);
    const boardCouriers = (boardJson.data.couriers as Array<{ fullName: string | null }>).map(
      (courier) => courier.fullName ?? '',
    );
    expect(boardCouriers).toEqual(names);
  });

  test('legacy add-driver page opens the popup on Flotte', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/flotte/nouveau');
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/tableau-de-bord\/flotte\?ajouter=1$/);
    await expect(page.getByRole('heading', { name: 'Flotte', level: 1 })).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Ajouter un chauffeur' })).toBeVisible();
    await expect(dialog.getByLabel('Nom complet')).toBeVisible();
  });
});
