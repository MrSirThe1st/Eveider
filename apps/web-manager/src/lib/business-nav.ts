export const BUSINESS_PRIMARY_NAV = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/organisation/tableau-de-bord' },
  { id: 'colis', label: 'Colis', href: '/organisation/tableau-de-bord/colis' },
  {
    id: 'organisation',
    label: 'Organisation',
    href: '/organisation/tableau-de-bord/parametres',
    section: 'Boutique',
  },
] as const;

export const BUSINESS_HIDDEN_PRIMARY_LABELS = [
  'Points',
  'Casiers',
  'Livraisons',
  'Retours',
  'Chauffeurs',
  'Incidents',
  'Facturation',
  'Équipe',
  'Paramètres',
] as const;

export function isBusinessPrimaryNavLabel(label: string): boolean {
  return BUSINESS_PRIMARY_NAV.some((item) => item.label === label);
}
