import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Admin operations IA', () => {
  test.describe.configure({ timeout: 90_000 });
  test('primary nav matches the locked destinations', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord');
    await dismissCookieBanner(page);

    const nav = page.locator('.nb-side-nav__link');
    await expect(nav.filter({ hasText: 'Tableau de bord' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Colis' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Livraisons' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Casiers' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Flotte' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Organisations' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Paramètres' })).toBeVisible();

    await expect(nav.filter({ hasText: 'Points' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Utilisateurs' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Retours' })).toHaveCount(0);
    await expect(nav.filter({ hasText: /^Chauffeurs$/ })).toHaveCount(0);

    await expect(page.locator('.nb-side-nav__section', { hasText: 'Réseau' })).toBeVisible();
    await expect(page.locator('.nb-side-nav__section', { hasText: 'Administration' })).toBeVisible();

    const profile = page.locator('.nb-sidebar-profile');
    await expect(profile).toContainText('Marie Kalala');
    await profile.click();
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/profil$/);
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();
  });

  test('dashboard queues link into filtered Colis and Livraisons', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'À traiter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Réseau' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Collectes à assigner/ })).toHaveAttribute(
      'href',
      '/tableau-de-bord/colis?attention=awaiting_assignment',
    );
    await expect(page.getByRole('link', { name: /Livraisons actives/ })).toHaveAttribute(
      'href',
      '/tableau-de-bord/livraisons',
    );
    await expect(page.getByRole('link', { name: /Au casier/ })).toHaveAttribute(
      'href',
      '/tableau-de-bord/colis?attention=at_locker',
    );
  });

  test('Flow 1 parcel shows Collecte Eveider and a Livraison', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const response = await page.request.get('/api/parcels?search=LSH-1002');
    const result = await response.json();
    expect(result.success).toBe(true);
    const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'LSH-1002',
    );
    expect(parcel).toBeTruthy();

    await page.goto(`/tableau-de-bord/colis/${parcel!.id}`, { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: /EVD/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Collecte Eveider').first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: /^En cours de transport$/ })).toBeVisible();
    await expect(page.getByText('Livraison aller')).toBeVisible();
    await expect(page.getByText('Chauffeur Eveider', { exact: false })).toBeVisible();
    await expect(page.getByText('Aucun transport Eveider')).toHaveCount(0);
  });

  test('Flow 2 parcel shows Dépôt au casier and no Eveider transport', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const response = await page.request.get('/api/parcels?search=LSH-1003');
    const result = await response.json();
    expect(result.success).toBe(true);
    const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'LSH-1003',
    );
    expect(parcel).toBeTruthy();

    await page.goto(`/tableau-de-bord/colis/${parcel!.id}`, { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: /EVD/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Dépôt au casier').first()).toBeVisible();
    await expect(page.getByText('Livraison aller')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assigner l’aller' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /En cours de transport/ })).toHaveCount(0);
    await expect(page.getByText('Aucun transport Eveider — dépôt effectué par l’entreprise.')).toBeVisible();
    const awaitingDeposit = page.getByRole('paragraph').filter({ hasText: /^En attente de dépôt$/ });
    const atLocker = page.getByText(/^Au casier$/);
    await expect(awaitingDeposit.or(atLocker).first()).toBeVisible();
  });

  test('Livraisons is transport-only and keeps incidents nested', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/livraisons');
    await dismissCookieBanner(page);

    const tabs = page.getByRole('navigation', { name: 'Vues livraisons' });
    await expect(tabs.getByRole('link', { name: 'Actives' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Historique' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Incidents' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Au casier' })).toHaveCount(0);
    await expect(tabs.getByRole('link', { name: 'Collectés' })).toHaveCount(0);

    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByText('Aller').first()).toBeVisible();
  });

  test('Casiers is canonical and /points redirects', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/points', { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(page);
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/tableau-de-bord\/casiers/);
    await expect(page.getByRole('heading', { name: 'Points', level: 1 })).toHaveCount(0);
  });

  test('Flotte is canonical and /chauffeurs redirects', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/tableau-de-bord\/flotte$/);
    await expect(page.getByRole('heading', { name: 'Flotte', level: 1 })).toBeVisible();
  });

  test('pricing copy uses the canonical commercial model', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres/facturation', { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Tarifs de livraison', level: 1 })).toBeVisible();
    await expect(page.getByText(/payée par le destinataire/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/payé par l.entreprise/i).first()).toBeVisible();
    await expect(page.getByText('distance et taille')).toHaveCount(0);
    await expect(page.getByText('distance × taille')).toHaveCount(0);
    await expect(page.getByLabel(/Flow 2 \/ retrait destinataire/)).toBeVisible();
  });

  test('Colis filters cover assignment, locker, and returns', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/colis?attention=awaiting_assignment');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Colis', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /À assigner/ })).toBeVisible();

    await page.goto('/tableau-de-bord/colis?attention=at_locker');
    await expect(page.getByRole('button', { name: /Au casier/ })).toBeVisible();

    await page.goto('/tableau-de-bord/colis?attention=return_at_locker');
    await expect(page.getByRole('button', { name: /Retours au casier/ })).toBeVisible();
    await expect(page.getByText('Aucun colis actuellement au casier')).toHaveCount(0);
  });

  test('Flow 1 assignment is offered only when Eveider must transport', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const response = await page.request.get('/api/parcels?search=F8-FLOW1-NEW');
    const result = await response.json();
    const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'F8-FLOW1-NEW',
    );
    expect(parcel).toBeTruthy();

    await page.goto(`/tableau-de-bord/colis/${parcel!.id}`);
    await dismissCookieBanner(page);
    await expect(page.getByText('Collecte Eveider').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner l’aller' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner le retour client' })).toHaveCount(0);
  });

  test('customer-return 3A assignment is offered when a return awaits Eveider pickup', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const response = await page.request.get('/api/parcels?search=F8-RETURN-3A');
    const result = await response.json();
    const flow3a = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'F8-RETURN-3A',
    );
    expect(flow3a).toBeTruthy();

    await page.goto(`/tableau-de-bord/colis/${flow3a!.id}`);
    await dismissCookieBanner(page);
    await expect(page.getByText('Retour client').first()).toBeVisible();
    await expect(page.getByText('Retour Eveider').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner le retour client' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner l’aller' })).toHaveCount(0);
  });

  test('Utilisateurs stays a support route, not primary nav', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/utilisateurs');
    await dismissCookieBanner(page);
    const nav = page.locator('.nb-side-nav__link');
    await expect(nav.filter({ hasText: 'Utilisateurs' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/tableau-de-bord\/utilisateurs/);
  });

  test('Organisations has no verification queue or badges', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/organisations');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Organisations', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vérification' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Vérification' })).toHaveCount(0);
    await expect(page.getByLabel('Filtrer par vérification')).toHaveCount(0);

    await page.goto('/tableau-de-bord/organisations/verification');
    await expect(page).toHaveURL(/\/tableau-de-bord\/organisations$/);
  });
});
