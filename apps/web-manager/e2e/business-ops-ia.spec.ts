import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

async function openBusinessParcel(page: import('@playwright/test').Page, reference: string) {
  const response = await page.request.get(`/api/organisation/parcels?search=${reference}`);
  const result = await response.json();
  expect(result.success).toBe(true);
  const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
    (item) => item.reference === reference,
  );
  expect(parcel).toBeTruthy();
  await page.goto(`/organisation/tableau-de-bord/colis/${parcel!.id}`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissCookieBanner(page);
}

async function selectDestinationLocker(page: import('@playwright/test').Page) {
  const search = page.getByPlaceholder(/Rechercher un point/);
  await expect(search).toBeVisible();
  const katuba = page.getByRole('heading', { name: /Casier — EVEIDER KATUBA/i });
  await expect(katuba).toBeVisible({ timeout: 20_000 });
  await katuba.click();
  await expect(page.getByText('Sélectionnez un casier Eveider.')).toHaveCount(0);
}

test.describe('Business portal IA', () => {
  test.describe.configure({ timeout: 90_000 });

  test('primary navigation is Tableau de bord / Colis / Organisation', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord');
    await dismissCookieBanner(page);

    const nav = page.locator('.nb-side-nav__link');
    await expect(nav.filter({ hasText: 'Tableau de bord' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Colis' })).toBeVisible();
    await expect(nav.filter({ hasText: 'Organisation' })).toBeVisible();

    await expect(nav.filter({ hasText: 'Points' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Casiers' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Livraisons' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Retours' })).toHaveCount(0);
    await expect(nav.filter({ hasText: /^Chauffeurs$/ })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Incidents' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Facturation' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Paramètres' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Vérification' })).toHaveCount(0);

    await expect(page.locator('.nb-side-nav__section', { hasText: 'Boutique' })).toBeVisible();

    const profile = page.locator('.nb-sidebar-profile');
    await expect(profile).toContainText('Chantal Kasongo');
    await profile.click();
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/profil$/);
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();
  });

  test('dashboard attention queues never treat Flow 2 as En transport', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'À traiter' })).toBeVisible();
    await expect(page.getByRole('link', { name: /À déposer au casier/ })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/colis?attention=awaiting_deposit',
    );
    await expect(page.getByRole('link', { name: /En transport/ })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/colis?attention=in_transit',
    );

    await page.goto('/organisation/tableau-de-bord/colis?attention=in_transit');
    await expect(page.getByText('Réf. LSH-1003')).toHaveCount(0);
    await expect(page.getByText('Réf. LSH-1002')).toBeVisible();
  });

  test('Flow 1 create has no driver selector and shows recipient payer', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/colis/nouveau');
    await dismissCookieBanner(page);

    await expect(
      page.getByRole('heading', { name: 'Comment ce colis entre-t-il dans le réseau Eveider ?' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Collecte Eveider/ })).toBeVisible();
    await expect(page.getByText('Assigner un chauffeur')).toHaveCount(0);
    await expect(page.getByLabel('Chauffeur')).toHaveCount(0);

    await page.getByRole('button', { name: /Collecte Eveider/ }).click();
    const contact = page.getByLabel('Contact collecte');
    if (!(await contact.inputValue())) {
      await contact.fill('Boutique Lubum');
    }
    const phone = page.getByLabel('Téléphone de collecte');
    if (!(await phone.inputValue())) {
      await phone.fill('+243900000010');
    }
    const address = page.getByLabel('Adresse de collecte');
    if (!(await address.inputValue())) {
      await address.fill('12 Av. Lumumba, Lubumbashi');
    }
    await page.getByRole('button', { name: 'Continuer' }).click();

    await page.getByLabel('Nom', { exact: true }).fill('Test Flow Un');
    await page.getByLabel('Téléphone', { exact: true }).fill(`+24397${Date.now().toString().slice(-7)}`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    await selectDestinationLocker(page);
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page.getByText('Payé par')).toBeVisible();
    await expect(page.getByText('Frais de livraison')).toBeVisible();
    await expect(page.getByText('Prochaine étape')).toBeVisible();
    await page.getByRole('button', { name: 'Créer le colis' }).click();

    await expect(page).toHaveURL(/\/colis\/[0-9a-f-]+\?created=1/, { timeout: 30_000 });
    await expect(page.getByText('En attente de prise en charge').first()).toBeVisible();
    await expect(page.getByText('Eveider doit maintenant organiser la collecte')).toBeVisible();
    await expect(page.getByText('Assigner un chauffeur')).toHaveCount(0);
  });

  test('Flow 2 create has no transport and waits for deposit', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/colis/nouveau');
    await dismissCookieBanner(page);

    await page.getByRole('button', { name: /Dépôt au casier/ }).click();
    await expect(page.getByText('Aucun chauffeur Eveider n’intervient')).toBeVisible();
    await expect(page.getByLabel('Adresse de collecte')).toHaveCount(0);
    const contact = page.getByLabel('Contact entreprise');
    if (!(await contact.inputValue())) {
      await contact.fill('Boutique Lubum');
    }
    const phone = page.getByLabel('Téléphone entreprise');
    if (!(await phone.inputValue())) {
      await phone.fill('+243900000010');
    }
    await page.getByRole('button', { name: 'Continuer' }).click();

    await page.getByLabel('Nom', { exact: true }).fill('Test Flow Deux');
    await page.getByLabel('Téléphone', { exact: true }).fill(`+24396${Date.now().toString().slice(-7)}`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page.getByText('Vous devrez déposer ce colis au casier sélectionné.')).toBeVisible();
    await selectDestinationLocker(page);
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page.getByText('Frais de retrait')).toBeVisible();
    await expect(page.getByText('Payé par')).toBeVisible();
    await expect(page.getByText('Prochaine étape')).toBeVisible();
    await expect(page.getByText(/instructions de dépôt/i)).toBeVisible();
    await expect(page.getByText('Frais de livraison')).toHaveCount(0);
    await page.getByRole('button', { name: 'Créer le colis' }).click();

    await expect(page).toHaveURL(/\/colis\/[0-9a-f-]+\?created=1/);
    await expect(page.getByText('En attente de dépôt').first()).toBeVisible();
    await expect(page.getByText('Aucun transport Eveider')).toBeVisible();
    await expect(page.getByText('Déposez maintenant le colis au casier')).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: /^Prêt au retrait$/ })).toHaveCount(0);
  });

  test('Flow 2 deposit stand-in goes to Au casier, not Prêt au retrait', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await openBusinessParcel(page, 'LSH-1003');

    await expect(page.getByText('Dépôt au casier').first()).toBeVisible();
    await expect(page.getByText('Aucun transport Eveider')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner un chauffeur' })).toHaveCount(0);
    await expect(page.getByText('Livraison aller')).toHaveCount(0);

    const deposit = page.getByRole('button', { name: 'Confirmer le dépôt — mode de secours' });
    if (await deposit.isVisible().catch(() => false)) {
      await deposit.click();
      await expect(page.getByText('Au casier').first()).toBeVisible();
      await expect(page.getByRole('paragraph').filter({ hasText: /^Prêt au retrait$/ })).toHaveCount(0);
    } else {
      await expect(page.getByText('Au casier').first()).toBeVisible();
    }
  });

  test('Flow 1 detail shows read-only Transport Eveider', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await openBusinessParcel(page, 'LSH-1002');

    await expect(page.getByText('Collecte Eveider').first()).toBeVisible();
    await expect(page.getByText('Transport Eveider').first()).toBeVisible();
    await expect(page.getByText(/Chauffeur Eveider :/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner un chauffeur' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assigner l’aller' })).toHaveCount(0);
  });

  test('billing counts only Business-owed charges and hides payer override', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/parametres/facturation');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Facturation', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Montant à payer' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Historique des frais' })).toBeVisible();
    await expect(page.getByLabel('Qui paie la livraison')).toHaveCount(0);
    await expect(page.getByText('Paiement à la livraison')).toHaveCount(0);
    await expect(page.getByText(/h de stockage incluses/)).toBeVisible();
    await expect(page.getByText('Compte de règlement')).toHaveCount(0);
    await expect(page.getByText('Limites Eveider')).toHaveCount(0);
  });

  test('legacy COD, payment-responsibility and org-driver controls stay out of the product', async ({
    page,
  }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/colis/nouveau');
    await dismissCookieBanner(page);

    await expect(page.getByLabel('Montant COD')).toHaveCount(0);
    await expect(page.getByLabel('Qui paie')).toHaveCount(0);
    await expect(page.getByText('Point partenaire')).toHaveCount(0);

    const nav = page.locator('.nb-side-nav__link');
    await expect(nav.filter({ hasText: /^Chauffeurs$/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ajouter un chauffeur' })).toHaveCount(0);
  });

  test('legacy /chauffeurs bookmarks redirect to the dashboard', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/organisation\/tableau-de-bord$/);
    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toHaveCount(0);
  });

  test('customer return 3A/3B approval is available when a requested return exists', async ({
    page,
  }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    const response = await page.request.get('/api/organisation/parcels?search=F8-RETURN-REQUESTED');
    const result = await response.json();
    expect(result.success).toBe(true);
    const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
      (item) => item.reference === 'F8-RETURN-REQUESTED',
    );
    expect(parcel).toBeTruthy();
    await page.goto(`/organisation/tableau-de-bord/colis/${parcel!.id}`);
    await dismissCookieBanner(page);

    await expect(page.getByRole('button', { name: 'Autoriser' })).toBeVisible();
    await expect(page.getByText('Retour client')).toBeVisible();
    await expect(page.getByText('Processus :')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Retour Eveider' })).toHaveCount(1);
    await expect(page.getByText('Assigner le retour client')).toHaveCount(0);
  });
});
