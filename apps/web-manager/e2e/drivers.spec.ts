import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Organization drivers', () => {
  test('list shows operational state and opens driver details', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(
      page.getByText('Vos chauffeurs et où ils en sont.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ajouter un chauffeur' })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/chauffeurs/nouveau',
    );
    await expect(page.getByRole('searchbox', { name: 'Rechercher un chauffeur' })).toBeVisible();

    const jean = page.getByRole('link', { name: 'Jean-Pierre Tshibanda' });
    await expect(jean).toBeVisible();
    await expect(page.getByText('Ruth Mbuyi')).toBeVisible();

    await jean.click();
    await expect(page).toHaveURL(/\/chauffeurs\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Jean-Pierre Tshibanda', level: 1 })).toBeVisible();

    const tabs = page.getByRole('navigation', { name: 'Sections chauffeur' });
    await expect(tabs.getByRole('link', { name: 'Aperçu' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Livraisons' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Documents' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Itinéraires' })).toHaveCount(0);
    await expect(tabs.getByRole('link', { name: 'Activité' })).toHaveCount(0);

    await expect(page.getByText('Identité')).toBeVisible();
    await expect(page.getByText('Situation actuelle')).toBeVisible();

    await tabs.getByRole('link', { name: 'Livraisons' }).click();
    await expect(page).toHaveURL(/\/livraisons$/);

    await tabs.getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByText('Contrôle des pièces')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);
  });

  test('add driver is a separate page, not embedded in the list', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByLabel('Nom complet')).toHaveCount(0);

    await page.getByRole('link', { name: 'Ajouter un chauffeur' }).click();
    await expect(page).toHaveURL(/\/chauffeurs\/nouveau$/);
    await expect(page.getByRole('heading', { name: 'Ajouter un chauffeur', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Nom complet')).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter et inviter' })).toBeVisible();
  });
});

test.describe('Admin drivers', () => {
  test('list shows organization column and opens driver details', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Entreprise' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ajouter un chauffeur' })).toHaveAttribute(
      'href',
      '/tableau-de-bord/chauffeurs/nouveau',
    );
    await expect(page.getByRole('searchbox', { name: 'Rechercher un chauffeur' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Entreprise' })).toBeVisible();

    const jean = page.getByRole('link', { name: 'Jean-Pierre Tshibanda' });
    await expect(jean).toBeVisible();
    await expect(page.getByText('Boutique Kenya').first()).toBeVisible();

    await jean.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/chauffeurs\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Jean-Pierre Tshibanda', level: 1 })).toBeVisible();
    await expect(page.getByText('Boutique Kenya').first()).toBeVisible();

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
    await expect(page.getByText('Revue plateforme Eveider')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bloquer' })).toBeVisible();
  });

  test('add driver is Eveider fleet only and not embedded in the list', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByLabel('Nom complet')).toHaveCount(0);

    await page.getByRole('link', { name: 'Ajouter un chauffeur' }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/chauffeurs\/nouveau$/);
    await expect(page.getByRole('heading', { name: 'Ajouter un chauffeur', level: 1 })).toBeVisible();
    await expect(page.getByText('Flotte Eveider uniquement')).toBeVisible();
    await expect(page.getByLabel('Nom complet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter et inviter' })).toBeVisible();
  });
});
