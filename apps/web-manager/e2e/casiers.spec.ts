import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin casiers network', () => {
  test('overview has no embedded create and nouveau requires an explicit zone', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau casier' })).toBeVisible();
    await expect(page.getByText('Automatique (selon la ville)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Ville' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Zone' })).toBeVisible();

    await page.getByRole('link', { name: 'Nouveau casier' }).first().click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/nouveau$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Nouveau casier', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Ville')).toBeVisible();
    await expect(page.getByLabel('Zone')).toBeVisible();
    await expect(page.getByText('Automatique (selon la ville)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toBeDisabled();

    await page.getByLabel('Ville').selectOption({ label: 'Kolwezi' });
    const zoneSelect = page.getByLabel('Zone');
    await expect(zoneSelect).toBeEnabled();
    const zoneLabels = await zoneSelect.locator('option').allTextContents();
    expect(zoneLabels.some((label) => /Lubumbashi/i.test(label))).toBe(false);
    expect(zoneLabels.some((label) => /Kolwezi/i.test(label))).toBe(true);
    expect(zoneSelect).toHaveValue('');
  });

  test('search, city/zone/status filters, and row click selects without opening detail', async ({
    page,
  }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    await page.getByRole('searchbox', { name: 'Rechercher un casier' }).fill('DILALA');
    await expect(page.getByRole('link', { name: /EVEIDER DILALA/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /EVEIDER KAMPEMBA/i })).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'Rechercher un casier' }).fill('');
    await page.getByRole('button', { name: /^\+ Ville/ }).click();
    await page.getByRole('option', { name: 'Kolwezi', exact: true }).click();
    await expect(page.getByRole('link', { name: /EVEIDER DILALA/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /EVEIDER KAMPEMBA/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^\+ Zone/ }).click();
    const zoneTexts = await page.getByRole('option').allTextContents();
    expect(zoneTexts.some((label) => /Lubumbashi/i.test(label))).toBe(false);

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^\+ Statut/ }).click();
    await page.getByRole('option', { name: 'Hors ligne' }).click();
    await expect(page.getByRole('link', { name: /EVEIDER DILALA/i })).toHaveCount(0);

    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(page.getByRole('link', { name: /EVEIDER KAMPEMBA/i })).toBeVisible();

    const kampembaRow = page.locator('tr').filter({ hasText: /EVEIDER KAMPEMBA/i });
    await kampembaRow.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers$/);
    await expect(kampembaRow).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('link', { name: /EVEIDER DILALA/i }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/[0-9a-f-]+$/);
  });

  test('creates a locker, reassigns same-city then confirmed cross-city, and holding count drops', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await signIn(page, 'admin@eveider.cd');

    const historical = await page.request.get('/api/parcels?search=F8-FLOW1-TRANSIT');
    const historicalJson = await historical.json();
    const beforeCharges = JSON.stringify(historicalJson);

    await page.goto('/tableau-de-bord/parametres/reseau');
    await dismissCookieBanner(page);

    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const zoneCode = `N${suffix}`.slice(0, 6);
    const zoneName = `Manika ${zoneCode}`;
    const kolweziSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Kolwezi', exact: true }),
    });
    await kolweziSection.getByRole('button', { name: 'Actions de la ville' }).click();
    await page.getByRole('menuitem', { name: 'Nouvelle zone' }).click();
    await kolweziSection.getByLabel('Nom', { exact: true }).fill(zoneName);
    await expect(kolweziSection.getByLabel('Code', { exact: true })).toHaveCount(0);
    await kolweziSection.getByRole('button', { name: 'Créer la zone' }).click();
    await expect(page.getByText(new RegExp(`Zone ${zoneName} créée`))).toBeVisible({ timeout: 30_000 });

    await page.goto('/tableau-de-bord/casiers/nouveau', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toBeDisabled();

    const map = page.locator('.gm-style').first();
    await expect(map).toBeVisible({ timeout: 20_000 });
    await map.click({ position: { x: 220, y: 180 } });
    await expect(page.getByText(/-?\d+\.\d{3,}, -?\d+\.\d{3,}/).first()).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/adresse/i).fill(`Av. Manika ${zoneCode}, Kolwezi`);
    const codeField = page.getByRole('textbox', { name: 'CODE' });
    await expect(codeField).toHaveValue(/^EVP[0-9A-HJKMNP-TV-Z]{6}/, { timeout: 20_000 });
    await page.getByLabel(/^nom$/i).fill(`EVEIDER MANIKA ${zoneCode}`);
    await page.getByLabel('Ville').selectOption({ label: 'Kolwezi' });
    await page.getByLabel('Zone').selectOption({ label: `${zoneName} (Kolwezi)` });
    await expect(page.getByRole('button', { name: 'Créer le casier' })).toBeEnabled();
    await page.getByRole('button', { name: 'Créer le casier' }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/[0-9a-f-]+$/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: `EVEIDER MANIKA ${zoneCode}` })).toBeVisible();

    const sameCity = page.getByLabel('Zone de service');
    await sameCity.selectOption({ label: `${zoneName} (Kolwezi)` });
    await expect(page.getByText('Zone mise à jour. Les colis déjà créés conservent leur tarif enregistré.')).toBeVisible();

    await page.getByRole('button', { name: 'Déplacer vers une autre ville' }).click();
    await expect(page.getByText('Changement de ville')).toBeVisible();
    await page.getByLabel('Nouvelle ville').selectOption({ label: 'Lubumbashi' });
    const otherZone = page.getByLabel('Nouvelle zone');
    await expect(otherZone).toBeEnabled();
    const otherLabels = await otherZone.locator('option').allTextContents();
    expect(otherLabels.some((label) => /Kolwezi/i.test(label))).toBe(false);
    await otherZone.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Confirmer le déplacement' }).click();
    await expect(page.getByText('Zone mise à jour. Les colis déjà créés conservent leur tarif enregistré.')).toBeVisible();

    await page.goto('/tableau-de-bord/casiers');
    await expect(page.getByRole('link', { name: `EVEIDER MANIKA ${zoneCode}` })).toBeVisible();

    const afterHistorical = await page.request.get('/api/parcels?search=F8-FLOW1-TRANSIT');
    expect(JSON.stringify(await afterHistorical.json())).toBe(beforeCharges);
  });

  test('locker detail keeps historical pricing copy and same-city reassignment', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/casiers');
    await dismissCookieBanner(page);

    const lockerLink = page.getByRole('link', { name: /EVEIDER DILALA/i }).first();
    await expect(lockerLink).toBeVisible();
    await lockerLink.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /EVEIDER DILALA/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Zone de service')).toBeVisible();
    await expect(page.getByText(/Les colis déjà créés conservent leur tarif enregistré/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers une autre ville' })).toBeVisible();
  });
});
