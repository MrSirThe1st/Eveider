export const DRIVER_PRIMARY_TABS = [
  { key: 'Home', label: 'Livraisons', i18nKey: 'tabs.deliveries' as const, icon: 'package' },
  { key: 'History', label: 'Historique', i18nKey: 'tabs.history' as const, icon: 'clock' },
] as const;

export const DRIVER_CONTEXTUAL_ROUTE_SCREEN = 'Route';

export const DRIVER_REMOVED_PRIMARY_TABS = [
  'Accueil',
  'Itinéraire',
  'Chat',
  'Casiers',
  'Points',
  'Retours',
  'Colis',
  'Scanner',
  'Incidents',
] as const;
