import type { BusinessPermission } from '@eveider/domain';

export type SettingsPersona = 'organization' | 'admin';

export type SettingsNavItem = {
  id: string;
  label: string;
  href: string;
  /** Org-only: hide unless the user has this permission. */
  permission?: BusinessPermission;
  /** Match nested routes (e.g. casiers/configuration). */
  matchPrefix?: boolean;
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
  members: `${ORG_BASE}/membres`,
  roles: `${ORG_BASE}/roles`,
  teams: `${ORG_BASE}/equipes`,
  lockers: `${ORG_BASE}/casiers`,
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
  billing: `${ADMIN_BASE}/facturation`,
  api: `${ADMIN_BASE}/api`,
  integrations: `${ADMIN_BASE}/integrations`,
} as const;

export const ORGANIZATION_SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: 'mon-compte',
    label: 'Mon compte',
    items: [
      { id: 'profil', label: 'Profil', href: ORG_SETTINGS_ROUTES.profile },
      { id: 'securite', label: 'Sécurité', href: ORG_SETTINGS_ROUTES.security },
      { id: 'notifications', label: 'Notifications', href: ORG_SETTINGS_ROUTES.notifications },
      { id: 'preferences', label: 'Préférences', href: ORG_SETTINGS_ROUTES.preferences },
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
        permission: 'settings',
      },
      {
        id: 'membres',
        label: 'Membres',
        href: ORG_SETTINGS_ROUTES.members,
        permission: 'manage_team',
      },
      {
        id: 'roles',
        label: 'Droits d’accès',
        href: ORG_SETTINGS_ROUTES.roles,
        permission: 'settings',
      },
      {
        id: 'equipes',
        label: 'Équipes',
        href: ORG_SETTINGS_ROUTES.teams,
        permission: 'settings',
      },
      {
        id: 'casiers',
        label: 'Casiers',
        href: ORG_SETTINGS_ROUTES.lockers,
        permission: 'settings',
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
        permission: 'billing',
      },
    ],
  },
  {
    id: 'developpeurs',
    label: 'Connexions',
    items: [
      {
        id: 'api',
        label: 'API',
        href: ORG_SETTINGS_ROUTES.api,
        permission: 'settings',
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    items: [
      {
        id: 'external',
        label: 'Intégrations',
        href: ORG_SETTINGS_ROUTES.integrations,
        permission: 'settings',
      },
    ],
  },
];

export const ADMIN_SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: 'mon-compte',
    label: 'Mon compte',
    items: [
      { id: 'profil', label: 'Profil', href: ADMIN_SETTINGS_ROUTES.profile },
      { id: 'securite', label: 'Sécurité', href: ADMIN_SETTINGS_ROUTES.security },
      { id: 'notifications', label: 'Notifications', href: ADMIN_SETTINGS_ROUTES.notifications },
      { id: 'preferences', label: 'Préférences', href: ADMIN_SETTINGS_ROUTES.preferences },
    ],
  },
  {
    id: 'eveider',
    label: 'Eveider',
    items: [
      { id: 'plateforme', label: 'Plateforme', href: ADMIN_SETTINGS_ROUTES.platform },
      { id: 'administrateurs', label: 'Administrateurs', href: ADMIN_SETTINGS_ROUTES.admins },
      { id: 'roles', label: 'Droits d’accès', href: ADMIN_SETTINGS_ROUTES.roles },
      { id: 'equipes', label: 'Équipes', href: ADMIN_SETTINGS_ROUTES.teams },
      {
        id: 'casiers',
        label: 'Casiers',
        href: ADMIN_SETTINGS_ROUTES.lockers,
        matchPrefix: true,
      },
      { id: 'facturation', label: 'Facturation', href: ADMIN_SETTINGS_ROUTES.billing },
      { id: 'api', label: 'API', href: ADMIN_SETTINGS_ROUTES.api },
      { id: 'integrations', label: 'Intégrations', href: ADMIN_SETTINGS_ROUTES.integrations },
    ],
  },
];

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
