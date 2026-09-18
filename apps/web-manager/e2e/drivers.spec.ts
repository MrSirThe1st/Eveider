import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Organization drivers', () => {
  test('org chauffeur pages are locked', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(
      page.getByText('La gestion des chauffeurs n’est plus disponible pour l’entreprise.'),
    ).toBeVisible();
    await expect(page.getByTestId('business-drivers-header-add')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Jean-Pierre Tshibanda' })).toHaveCount(0);
  });

  test('add driver page is locked', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/chauffeurs/nouveau');
    await dismissCookieBanner(page);

    await expect(page.getByRole('heading', { name: 'Chauffeurs', level: 1 })).toBeVisible();
    await expect(
      page.getByText('La gestion des chauffeurs n’est plus disponible pour l’entreprise.'),
    ).toBeVisible();
    await expect(page.getByLabel('Nom complet')).toHaveCount(0);
  });
});

test.describe('Admin drivers', () => {
  test('list shows Eveider fleet and opens driver details', async ({ page }) => {
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
    await expect(page.getByText('Flotte Eveider').first()).toBeVisible();
    await expect(page.getByText('Boutique Kenya')).toHaveCount(0);

    await jean.click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/chauffeurs\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Jean-Pierre Tshibanda', level: 1 })).toBeVisible();
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
