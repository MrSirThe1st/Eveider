import { describe, expect, it } from 'vitest';
import {
  ADMIN_SETTINGS_NAV,
  filterOrganizationSettingsNav,
  firstOrganizationSettingsPath,
  isSettingsNavItemActive,
  ORGANIZATION_SETTINGS_NAV,
  ORG_SETTINGS_ROUTES,
} from './settings-nav';

describe('filterOrganizationSettingsNav', () => {
  it('keeps only Mon compte for dispatchers', () => {
    const groups = filterOrganizationSettingsNav([
      'dashboard',
      'view_parcels',
      'create_parcels',
      'manage_operations',
      'view_reports',
      'manage_drivers',
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe('mon-compte');
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      'profil',
      'securite',
      'preferences',
    ]);
  });

  it('includes org, billing, and members for owners', () => {
    const groups = filterOrganizationSettingsNav([
      'dashboard',
      'view_parcels',
      'create_parcels',
      'manage_operations',
      'view_reports',
      'billing',
      'settings',
      'manage_team',
      'manage_drivers',
      'transfer_ownership',
    ]);
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    expect(ids).toContain('organisation-details');
    expect(ids).not.toContain('verification');
    expect(ids).toContain('equipe');
    expect(ids).toContain('plans');
    expect(ids).not.toContain('api');
    expect(ids).not.toContain('excel');
    expect(ids).not.toContain('roles');
    expect(ids).not.toContain('notifications');
    expect(ids).not.toContain('equipes');
    expect(ids).not.toContain('casiers');
  });
});

describe('unpublished settings stay hidden', () => {
  it('omits coming-soon items from org and admin sidebars', () => {
    const orgIds = ORGANIZATION_SETTINGS_NAV.flatMap((group) => group.items.map((item) => item.id));
    const adminIds = ADMIN_SETTINGS_NAV.flatMap((group) => group.items.map((item) => item.id));
    expect(orgIds).not.toContain('roles');
    expect(orgIds).not.toContain('notifications');
    expect(orgIds).not.toContain('api');
    expect(orgIds).not.toContain('excel');
    expect(adminIds).not.toContain('roles');
    expect(adminIds).not.toContain('notifications');
    expect(adminIds).not.toContain('api');
    expect(adminIds).not.toContain('integrations');
  });

  it('labels the platform staff page as Équipe', () => {
    const equipe = ADMIN_SETTINGS_NAV.flatMap((group) => group.items).find(
      (item) => item.id === 'administrateurs',
    );
    expect(equipe?.label).toBe('Équipe');
    expect(equipe?.href).toBe('/tableau-de-bord/parametres/administrateurs');
  });

  it('labels the organization team page as Équipe', () => {
    const equipe = ORGANIZATION_SETTINGS_NAV.flatMap((group) => group.items).find(
      (item) => item.id === 'equipe',
    );
    expect(equipe?.label).toBe('Équipe');
    expect(equipe?.href).toBe(ORG_SETTINGS_ROUTES.team);
  });
});

describe('firstOrganizationSettingsPath', () => {
  it('lands on organisation when settings is allowed', () => {
    expect(firstOrganizationSettingsPath(['settings'])).toBe(ORG_SETTINGS_ROUTES.organisation);
  });

  it('lands on profile otherwise', () => {
    expect(firstOrganizationSettingsPath(['dashboard'])).toBe(ORG_SETTINGS_ROUTES.profile);
  });
});

describe('isSettingsNavItemActive', () => {
  it('matches casiers nested routes with matchPrefix', () => {
    expect(
      isSettingsNavItemActive(
        {
          id: 'casiers',
          label: 'Casiers',
          href: '/tableau-de-bord/parametres/casiers/configuration',
          matchPrefix: true,
        },
        '/tableau-de-bord/parametres/casiers/modeles/nouveau',
      ),
    ).toBe(true);
  });

  it('does not treat réseau as a casiers settings page', () => {
    expect(
      isSettingsNavItemActive(
        {
          id: 'casiers',
          label: 'Casiers',
          href: '/tableau-de-bord/parametres/casiers/configuration',
          matchPrefix: true,
        },
        '/tableau-de-bord/parametres/reseau',
      ),
    ).toBe(false);
  });

  it('requires exact match without matchPrefix', () => {
    expect(
      isSettingsNavItemActive(
        { id: 'profil', label: 'Profil', href: ORG_SETTINGS_ROUTES.profile },
        `${ORG_SETTINGS_ROUTES.profile}/extra`,
      ),
    ).toBe(false);
  });
});

describe('admin fonctionnement nav', () => {
  it('orders Règles générales, Tarifs, Réseau, then Casiers', () => {
    const fonctionnement = ADMIN_SETTINGS_NAV.find((group) => group.id === 'fonctionnement');
    expect(fonctionnement?.items.map((item) => item.label)).toEqual([
      'Règles générales',
      'Tarifs',
      'Réseau',
      'Casiers',
    ]);
    expect(fonctionnement?.items.find((item) => item.id === 'reseau')?.href).toBe(
      '/tableau-de-bord/parametres/reseau',
    );
  });
});
