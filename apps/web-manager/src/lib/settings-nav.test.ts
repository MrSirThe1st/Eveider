import { describe, expect, it } from 'vitest';
import {
  filterOrganizationSettingsNav,
  firstOrganizationSettingsPath,
  isSettingsNavItemActive,
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
      'notifications',
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
    expect(ids).toContain('membres');
    expect(ids).toContain('plans');
    expect(ids).toContain('api');
    expect(ids).not.toContain('equipes');
    expect(ids).not.toContain('casiers');
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

  it('requires exact match without matchPrefix', () => {
    expect(
      isSettingsNavItemActive(
        { id: 'profil', label: 'Profil', href: ORG_SETTINGS_ROUTES.profile },
        `${ORG_SETTINGS_ROUTES.profile}/extra`,
      ),
    ).toBe(false);
  });
});
