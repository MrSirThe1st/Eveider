import { describe, expect, it } from 'vitest';
import {
  ADMIN_HIDDEN_PRIMARY_LABELS,
  ADMIN_PRIMARY_NAV,
  isAdminPrimaryNavLabel,
} from './admin-nav';

describe('Admin primary navigation', () => {
  it('contains the locked operational destinations in order', () => {
    expect(ADMIN_PRIMARY_NAV.map((item) => item.label)).toEqual([
      'Tableau de bord',
      'Colis',
      'Livraisons',
      'Casiers',
      'Flotte',
      'Organisations',
      'Paramètres',
    ]);
    expect(ADMIN_PRIMARY_NAV.map((item) => item.href)).toEqual([
      '/tableau-de-bord',
      '/tableau-de-bord/colis',
      '/tableau-de-bord/livraisons',
      '/tableau-de-bord/casiers',
      '/tableau-de-bord/flotte',
      '/tableau-de-bord/organisations',
      '/tableau-de-bord/parametres',
    ]);
    expect(ADMIN_PRIMARY_NAV.map((item) => ('section' in item ? item.section : undefined))).toEqual([
      undefined,
      undefined,
      undefined,
      'Réseau',
      'Réseau',
      'Réseau',
      'Administration',
    ]);
  });

  it('does not expose retired top-level destinations', () => {
    for (const label of ADMIN_HIDDEN_PRIMARY_LABELS) {
      expect(isAdminPrimaryNavLabel(label)).toBe(false);
    }
    expect(ADMIN_PRIMARY_NAV.some((item) => item.href.includes('/points'))).toBe(false);
    expect(ADMIN_PRIMARY_NAV.some((item) => item.href.includes('/utilisateurs'))).toBe(false);
    expect(ADMIN_PRIMARY_NAV.some((item) => item.href.includes('/chauffeurs'))).toBe(false);
    expect(ADMIN_PRIMARY_NAV.some((item) => item.href.includes('/retours'))).toBe(false);
  });
});
