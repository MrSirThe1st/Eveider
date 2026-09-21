import { expect, test } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

test.describe('Settings secondary sidebar', () => {
  test.describe.configure({ timeout: 90_000 });
  test('org owner sees full settings nav and organisation page', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/parametres', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/parametres\/organisation$/, { timeout: 30_000 });

    const nav = page.getByRole('navigation', { name: 'Sections des paramètres' });
    await expect(nav.getByRole('heading', { name: 'Compte', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Boutique', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Facturation', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Avancé', level: 2 })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Entreprise' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Vérification' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Membres' })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/parametres/membres',
    );
    await expect(nav.getByRole('link', { name: 'Équipes' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Casiers' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Facturation' })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/parametres/facturation',
    );
    await expect(nav.getByRole('link', { name: 'Excel' })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/parametres/integrations',
    );
    await expect(nav.getByRole('link', { name: 'Profil' })).toHaveAttribute(
      'href',
      '/organisation/tableau-de-bord/parametres/mon-compte/profil',
    );
    await expect(nav.getByRole('link', { name: /Droits d.acc/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Notifications' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Entreprise', level: 1 })).toBeVisible();

    // Primary nav: Organisation replaces Paramètres; Facturation / Équipe stay nested
    await expect(page.locator('.nb-side-nav__link', { hasText: 'Organisation' })).toBeVisible();
    await expect(page.locator('.nb-side-nav__link', { hasText: 'Paramètres' })).toHaveCount(0);
    await expect(page.locator('.nb-side-nav__link', { hasText: 'Facturation' })).toHaveCount(0);
    await expect(page.locator('.nb-side-nav__link', { hasText: 'Équipe' })).toHaveCount(0);

    await page.goto('/organisation/tableau-de-bord/parametres/membres');
    await expect(page.getByRole('heading', { name: 'Membres', level: 1 })).toBeVisible();

    await page.goto('/organisation/tableau-de-bord/parametres/roles');
    await expect(page).toHaveURL(/\/parametres\/membres$/);
    await expect(page.getByText('Bientôt disponible')).toHaveCount(0);

    await page.goto('/organisation/tableau-de-bord/parametres/facturation');
    await expect(page.getByRole('heading', { name: 'Facturation', level: 1 })).toBeVisible();

    await page.goto('/organisation/tableau-de-bord/parametres/mon-compte/profil');
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();

    // Click navigation still works (stub section)
    await nav.getByRole('link', { name: 'API' }).click();
    await expect(page).toHaveURL(/\/parametres\/api$/);
    await expect(page.getByRole('heading', { name: 'API', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Clé d.accès/ })).toBeVisible();

    await nav.getByRole('link', { name: 'Préférences' }).click();
    await expect(page).toHaveURL(/\/mon-compte\/preferences$/);
    await expect(page.getByRole('heading', { name: 'Préférences', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Langue' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Apparence' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Clair' })).toBeVisible();
    await expect(page.getByText('Français', { exact: true })).toBeVisible();

    await nav.getByRole('link', { name: 'Sécurité' }).click();
    await expect(page).toHaveURL(/\/mon-compte\/securite$/);
    await expect(page.getByRole('heading', { name: 'Sécurité', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mot de passe' })).toBeVisible();
    await expect(page.getByLabel('Mot de passe actuel')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nouveau mot de passe', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mettre à jour le mot de passe' })).toBeVisible();
    await expect(page.getByText('Bientôt disponible')).toHaveCount(0);
  });

  test('dispatcher only sees Mon compte items', async ({ page }) => {
    await signIn(page, 'boutique.lubum.logistics@eveider.cd');
    await page.goto('/organisation/tableau-de-bord/parametres');
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/mon-compte\/profil$/);

    const nav = page.getByRole('navigation', { name: 'Sections des paramètres' });
    await expect(nav.getByRole('heading', { name: 'Compte', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Boutique', level: 2 })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Profil' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Sécurité' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Notifications' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Entreprise' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Membres' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Facturation' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Excel' })).toHaveCount(0);

    await nav.getByRole('link', { name: 'Préférences' }).click();
    await expect(page).toHaveURL(/\/mon-compte\/preferences$/);
    await expect(page.getByRole('heading', { name: 'Préférences', level: 1 })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Automatique' })).toBeVisible();

    await page.goto('/organisation/tableau-de-bord/parametres/organisation');
    await expect(page).not.toHaveURL(/\/parametres\/organisation$/);
  });

  test('admin settings nav wires profile, facturation, and casiers entry', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, 'admin@eveider.cd');
    await page.goto('/tableau-de-bord/parametres');
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/profil$/);

    const nav = page.getByRole('navigation', { name: 'Sections des paramètres' });
    await expect(nav.getByRole('heading', { name: 'Mon compte', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Fonctionnement', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Équipe Eveider', level: 2 })).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Outils', level: 2 })).toHaveCount(0);
    const preferences = nav.getByRole('link', { name: 'Préférences', exact: true });
    await expect(preferences).toHaveAttribute(
      'href',
      '/tableau-de-bord/parametres/mon-compte/preferences',
    );
    await preferences.click();
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/preferences$/, { timeout: 15_000 });
    await expect(page.getByRole('radio', { name: 'Sombre' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Préférences' }).first()).toBeVisible();

    const security = nav.getByRole('link', { name: 'Sécurité', exact: true });
    await expect(security).toHaveAttribute(
      'href',
      '/tableau-de-bord/parametres/mon-compte/securite',
    );
    await page.goto('/tableau-de-bord/parametres/mon-compte/securite', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Sécurité', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Mot de passe actuel')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nouveau mot de passe', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mettre à jour le mot de passe' })).toBeVisible();

    await page.goto('/tableau-de-bord/parametres/mon-compte/profil', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Règles générales' })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Droits d.acc/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Notifications' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'API' })).toHaveCount(0);

    await page.goto('/tableau-de-bord/parametres/roles', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/parametres\/administrateurs$/, { timeout: 45_000 });
    await expect(page.getByText('Bientôt disponible')).toHaveCount(0);

    await page.goto('/tableau-de-bord/parametres/api', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/profil$/, { timeout: 45_000 });
    await expect(page.getByText('Bientôt disponible')).toHaveCount(0);

    await page.goto('/tableau-de-bord/parametres/integrations', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/parametres\/mon-compte\/profil$/, { timeout: 45_000 });
    await expect(page.getByText('Bientôt disponible')).toHaveCount(0);

    await page.goto('/tableau-de-bord/parametres/mon-compte/profil', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Casiers' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Tarifs de livraison' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Casiers' })).toHaveAttribute(
      'href',
      '/tableau-de-bord/parametres/casiers/configuration',
    );
    await expect(nav.getByRole('link', { name: 'Tarifs de livraison' })).toHaveAttribute(
      'href',
      '/tableau-de-bord/parametres/facturation',
    );
    await expect(nav.getByRole('link', { name: 'Règles générales', exact: true })).toHaveAttribute(
      'href',
      '/tableau-de-bord/parametres/plateforme',
    );

    await page.goto('/tableau-de-bord/parametres/facturation', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Tarifs de livraison' })).toBeVisible();

    await page.goto('/tableau-de-bord/parametres/tarifs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/parametres\/facturation$/);

    await page.goto('/tableau-de-bord/parametres/plateforme', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Règles générales', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/parametres\/plateforme/);
    await expect(page.getByRole('heading', { name: 'Devise de la plateforme' })).toBeVisible();

    await page.goto('/tableau-de-bord/parametres/casiers/configuration', {
      waitUntil: 'domcontentloaded',
    });
    const casiersTabs = page.getByRole('navigation', { name: 'Paramètres casiers' });
    await expect(casiersTabs.getByRole('link', { name: 'Configuration' })).toBeVisible();
    await expect(casiersTabs.getByRole('link', { name: 'Modèles' })).toBeVisible();
    await expect(casiersTabs.getByRole('link', { name: 'Villes et zones' })).toBeVisible();

    await casiersTabs.getByRole('link', { name: 'Modèles' }).click();
    await expect(page).toHaveURL(/\/parametres\/casiers\/modeles$/, { timeout: 45_000 });
    // Chrome stays mounted while the list body loads
    await expect(casiersTabs.getByRole('link', { name: 'Configuration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Casiers', level: 1 })).toBeVisible();
    await expect(nav).toBeVisible();

    await casiersTabs.getByRole('link', { name: 'Villes et zones' }).click();
    await expect(page).toHaveURL(/\/parametres\/casiers\/zones$/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Villes et zones', level: 1 })).toBeVisible();
    await expect(page.getByText('Kinshasa — à répartir')).toBeVisible();
    await expect(page.getByText('Lubumbashi — à répartir')).toBeVisible();
    await expect(page.getByText('Kolwezi — à répartir')).toBeVisible();
  });
});

