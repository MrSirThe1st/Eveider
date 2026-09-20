import { describe, expect, it } from 'vitest';
import { BUSINESS_HIDDEN_PRIMARY_LABELS, BUSINESS_PRIMARY_NAV } from './business-nav';

describe('BUSINESS_PRIMARY_NAV', () => {
  it('contains only the locked destinations', () => {
    expect(BUSINESS_PRIMARY_NAV.map((item) => item.label)).toEqual([
      'Tableau de bord',
      'Colis',
      'Organisation',
    ]);
    expect(BUSINESS_PRIMARY_NAV.map((item) => ('section' in item ? item.section : undefined))).toEqual([
      undefined,
      undefined,
      'Boutique',
    ]);
  });

  it('does not expose Points, Incidents, Chauffeurs or Facturation', () => {
    expect(BUSINESS_HIDDEN_PRIMARY_LABELS).toEqual(
      expect.arrayContaining([
        'Points',
        'Casiers',
        'Livraisons',
        'Retours',
        'Chauffeurs',
        'Incidents',
        'Facturation',
      ]),
    );
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/points'))).toBe(false);
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/incidents'))).toBe(false);
    expect(BUSINESS_PRIMARY_NAV.some((item) => item.href.includes('/chauffeurs'))).toBe(false);
  });
});
