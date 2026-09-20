export const ADMIN_PRIMARY_NAV = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/tableau-de-bord' },
  { id: 'colis', label: 'Colis', href: '/tableau-de-bord/colis' },
  { id: 'livraisons', label: 'Livraisons', href: '/tableau-de-bord/livraisons' },
  { id: 'casiers', label: 'Casiers', href: '/tableau-de-bord/casiers', section: 'Réseau' },
  { id: 'flotte', label: 'Flotte', href: '/tableau-de-bord/flotte', section: 'Réseau' },
  { id: 'organisations', label: 'Organisations', href: '/tableau-de-bord/organisations', section: 'Réseau' },
  { id: 'parametres', label: 'Paramètres', href: '/tableau-de-bord/parametres', section: 'Administration' },
] as const;

export const ADMIN_HIDDEN_PRIMARY_LABELS = [
  'Points',
  'Utilisateurs',
  'Retours',
  'Incidents',
  'Chauffeurs',
] as const;

export function isAdminPrimaryNavLabel(label: string): boolean {
  return ADMIN_PRIMARY_NAV.some((item) => item.label === label);
}
