import { describe, expect, it } from 'vitest';
import { BUSINESS_HIDDEN_PRIMARY_LABELS, BUSINESS_PRIMARY_NAV } from './business-nav';

describe('BUSINESS_PRIMARY_NAV', () => {
  it('contains only the locked destinations', () => {
    expect(BUSINESS_PRIMARY_NAV.map((item) => item.label)).toEqual([
      'Tableau de bord',
      'Colis',
      'Points',
      'Organisation',
    ]);
    expect(BUSINESS_PRIMARY_NAV.map((item) => ('section' in item ? item.section : undefined))).toEqual([
      undefined,
      undefined,
      undefined,
      'Entreprise',
    ]);
  });

  it('exposes Points but not Incidents, Chauffeurs or Facturation', () => {
    expect(BUSINESS_HIDDEN_PRIMARY_LABELS).toEqual(
      expect.arrayContaining([
        'Casiers',
        'Livraisons',
        'Retours',
        'Chauffeurs',
        'Incidents',
        'Facturation',
      ]),
    );
    expect(BUSINESS_HIDDEN_PRIMARY_LABELS).not.toContain('Points');
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/points'))).toBe(true);
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/incidents'))).toBe(false);
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/chauffeurs'))).toBe(false);
  });
});
