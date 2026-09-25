import type { BusinessPermission } from '@eveider/domain';

export type SettingsPersona = 'organization' | 'admin';

export type SettingsNavItem = {
  id: string;
  label: string;
  href: string;
  /** Short plain-language hint under the link (what it does / for whom). */
  description?: string;
  /** Org-only: hide unless the user has this permission. */
  permission?: BusinessPermission;
  /** Match nested routes (e.g. casiers/configuration). */
  matchPrefix?: boolean;
  /** Unfinished screens stay out of the sidebar until they ship. */
  comingSoon?: boolean;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

const ORG_BASE = '/organisation/tableau-de-bord/parametres';
const ADMIN_BASE = '/tableau-de-bord/parametres';

export const ORG_SETTINGS_ROUTES = {
  root: ORG_BASE,
  profile: `${ORG_BASE}/mon-compte/profil`,
  security: `${ORG_BASE}/mon-compte/securite`,
  notifications: `${ORG_BASE}/mon-compte/notifications`,
  preferences: `${ORG_BASE}/mon-compte/preferences`,
  organisation: `${ORG_BASE}/organisation`,
  team: `${ORG_BASE}/equipe`,
  roles: `${ORG_BASE}/roles`,
  billing: `${ORG_BASE}/facturation`,
  api: `${ORG_BASE}/api`,
  integrations: `${ORG_BASE}/integrations`,
} as const;

export const ADMIN_SETTINGS_ROUTES = {
  root: ADMIN_BASE,
  profile: `${ADMIN_BASE}/mon-compte/profil`,
  security: `${ADMIN_BASE}/mon-compte/securite`,
  notifications: `${ADMIN_BASE}/mon-compte/notifications`,
  preferences: `${ADMIN_BASE}/mon-compte/preferences`,
  platform: `${ADMIN_BASE}/plateforme`,
  admins: `${ADMIN_BASE}/administrateurs`,
  roles: `${ADMIN_BASE}/roles`,
  teams: `${ADMIN_BASE}/equipes`,
  lockers: `${ADMIN_BASE}/casiers/configuration`,
  network: `${ADMIN_BASE}/reseau`,
  billing: `${ADMIN_BASE}/facturation`,
  api: `${ADMIN_BASE}/api`,
  integrations: `${ADMIN_BASE}/integrations`,
} as const;

function publishedSettingsNav(groups: SettingsNavGroup[]): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.comingSoon),
    }))
    .filter((group) => group.items.length > 0);
}

const ORGANIZATION_SETTINGS_NAV_ALL: SettingsNavGroup[] = [
  {
    id: 'mon-compte',
    label: 'Compte',
    items: [
      {
        id: 'profil',
        label: 'Profil',
        href: ORG_SETTINGS_ROUTES.profile,
        description: 'Votre nom et e-mail',
      },
      {
        id: 'securite',
        label: 'Sécurité',
        href: ORG_SETTINGS_ROUTES.security,
        description: 'Mot de passe du compte',
      },
      {
        id: 'preferences',
        label: 'Préférences',
        href: ORG_SETTINGS_ROUTES.preferences,
        description: 'Langue et apparence',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: ORG_SETTINGS_ROUTES.notifications,
        description: 'Comment on vous prévient',
        comingSoon: true,
      },
    ],
  },
  {
    id: 'organisation',
    label: 'Entreprise',
    items: [
      {
        id: 'organisation-details',
        label: 'Entreprise',
        href: ORG_SETTINGS_ROUTES.organisation,
        description: 'Infos et lieux de collecte',
        permission: 'settings',
      },
      {
        id: 'equipe',
        label: 'Équipe',
        href: ORG_SETTINGS_ROUTES.team,
        description: 'Personnes de votre entreprise',
        permission: 'manage_team',
      },
      {
        id: 'roles',
        label: 'Droits d’accès',
        href: ORG_SETTINGS_ROUTES.roles,
        description: 'Qui peut faire quoi',
        permission: 'settings',
        comingSoon: true,
      },
    ],
  },
  {
    id: 'facturation',
    label: 'Facturation',
    items: [
      {
        id: 'plans',
        label: 'Facturation',
        href: ORG_SETTINGS_ROUTES.billing,
        description: 'Ce que votre entreprise doit à Eveider',
        permission: 'billing',
      },
    ],
  },
  {
    id: 'developpeurs',
    label: 'Avancé',
    items: [
      {
        id: 'api',
        label: 'API',
        href: ORG_SETTINGS_ROUTES.api,
        description: 'Relier un autre logiciel',
        permission: 'settings',
        comingSoon: true,
      },
      {
        id: 'excel',
        label: 'Excel',
        href: ORG_SETTINGS_ROUTES.integrations,
        description: 'Import de fichiers Excel',
        permission: 'settings',
        comingSoon: true,
      },
    ],
  },
];

export const ORGANIZATION_SETTINGS_NAV = publishedSettingsNav(ORGANIZATION_SETTINGS_NAV_ALL);

const ADMIN_SETTINGS_NAV_ALL: SettingsNavGroup[] = [
  {
    id: 'mon-compte',
    label: 'Mon compte',
    items: [
      {
        id: 'profil',
        label: 'Profil',
        href: ADMIN_SETTINGS_ROUTES.profile,
        description: 'Votre nom et e-mail',
      },
      {
        id: 'securite',
        label: 'Sécurité',
        href: ADMIN_SETTINGS_ROUTES.security,
        description: 'Mot de passe du compte',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: ADMIN_SETTINGS_ROUTES.notifications,
        description: 'Comment on vous prévient',
        comingSoon: true,
      },
      {
        id: 'preferences',
        label: 'Préférences',
        href: ADMIN_SETTINGS_ROUTES.preferences,
        description: 'Langue et apparence',
      },
    ],
  },
  {
    id: 'fonctionnement',
    label: 'Fonctionnement',
    items: [
      {
        id: 'plateforme',
        label: 'Règles générales',
        href: ADMIN_SETTINGS_ROUTES.platform,
        description: 'Devise plateforme et contacts Eveider',
      },
      {
        id: 'facturation',
        label: 'Tarifs',
        href: ADMIN_SETTINGS_ROUTES.billing,
        description: 'Ce qu’Eveider facture : transport, casiers et stockage',
      },
      {
        id: 'reseau',
        label: 'Réseau',
        href: ADMIN_SETTINGS_ROUTES.network,
        description: 'Villes et zones d’exploitation',
        matchPrefix: true,
      },
      {
        id: 'casiers',
        label: 'Casiers',
        href: ADMIN_SETTINGS_ROUTES.lockers,
        description: 'Rétention, rappel et modèles de grille',
        matchPrefix: true,
      },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe Eveider',
    items: [
      {
        id: 'administrateurs',
        label: 'Équipe',
        href: ADMIN_SETTINGS_ROUTES.admins,
        description: 'Accès à l’administration Eveider',
      },
      {
        id: 'roles',
        label: 'Droits d’accès',
        href: ADMIN_SETTINGS_ROUTES.roles,
        description: 'Qui peut voir ou modifier quoi',
        comingSoon: true,
      },
      {
        id: 'equipes',
        label: 'Personnel interne',
        href: ADMIN_SETTINGS_ROUTES.teams,
        description: 'Dispatchers et accès plateforme — la flotte se gère dans Flotte',
      },
    ],
  },
  {
    id: 'outils',
    label: 'Outils',
    items: [
      {
        id: 'api',
        label: 'API',
        href: ADMIN_SETTINGS_ROUTES.api,
        description: 'Relier Eveider à un autre logiciel',
        comingSoon: true,
      },
      {
        id: 'integrations',
        label: 'Exports Excel',
        href: ADMIN_SETTINGS_ROUTES.integrations,
        description: 'Télécharger colis et livraisons',
        comingSoon: true,
      },
    ],
  },
];

export const ADMIN_SETTINGS_NAV = publishedSettingsNav(ADMIN_SETTINGS_NAV_ALL);

export function filterOrganizationSettingsNav(
  permissions: readonly BusinessPermission[],
): SettingsNavGroup[] {
  return ORGANIZATION_SETTINGS_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || permissions.includes(item.permission),
    ),
  })).filter((group) => group.items.length > 0);
}

export function firstOrganizationSettingsPath(
  permissions: readonly BusinessPermission[],
): string {
  if (permissions.includes('settings')) return ORG_SETTINGS_ROUTES.organisation;
  return ORG_SETTINGS_ROUTES.profile;
}

export function isSettingsNavItemActive(item: SettingsNavItem, pathname: string): boolean {
  if (item.matchPrefix) {
    if (item.href.includes('/casiers')) {
      const casiersRoot = item.href.replace(/\/casiers\/.*$/, '/casiers');
      return pathname.startsWith(casiersRoot);
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
