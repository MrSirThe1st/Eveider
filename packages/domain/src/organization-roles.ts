/**
 * Organization membership roles — stored in `organization_memberships.role`.
 * One active role per user per organization. Account Owner is an Admin with ownership.
 */
export type OrganizationRole = 'account_owner' | 'admin' | 'dispatcher' | 'driver';

export const ORGANIZATION_ROLES: readonly OrganizationRole[] = [
  'account_owner',
  'admin',
  'dispatcher',
  'driver',
] as const;

/** Roles that use the organization web dashboard (not the driver mobile app). */
export const ORGANIZATION_WEB_ROLES: readonly OrganizationRole[] = [
  'account_owner',
  'admin',
  'dispatcher',
] as const;

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  account_owner: 'Propriétaire',
  admin: 'Administrateur',
  dispatcher: 'Dispatcher',
  driver: 'Chauffeur',
};

export type OrganizationPermission =
  | 'dashboard'
  | 'view_parcels'
  | 'create_parcels'
  | 'manage_operations'
  | 'view_reports'
  | 'billing'
  | 'settings'
  | 'manage_team'
  | 'manage_drivers'
  | 'transfer_ownership';

export const ORGANIZATION_PERMISSIONS: readonly OrganizationPermission[] = [
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
] as const;

const OWNER_AND_ADMIN: readonly OrganizationPermission[] = ORGANIZATION_PERMISSIONS.filter(
  (permission) => permission !== 'transfer_ownership',
);

export const ORGANIZATION_ROLE_PERMISSIONS: Record<
  OrganizationRole,
  readonly OrganizationPermission[]
> = {
  account_owner: ORGANIZATION_PERMISSIONS,
  admin: OWNER_AND_ADMIN,
  dispatcher: [
    'dashboard',
    'view_parcels',
    'create_parcels',
    'manage_operations',
    'view_reports',
    'manage_drivers',
  ],
  driver: [],
};

export function isOrganizationRole(value: string | null | undefined): value is OrganizationRole {
  return (
    value === 'account_owner' ||
    value === 'admin' ||
    value === 'dispatcher' ||
    value === 'driver'
  );
}

export function getOrganizationPermissions(
  role: OrganizationRole | null | undefined,
): readonly OrganizationPermission[] {
  if (!role || !isOrganizationRole(role)) return [];
  return ORGANIZATION_ROLE_PERMISSIONS[role];
}

export function hasOrganizationPermission(
  role: OrganizationRole | null | undefined,
  permission: OrganizationPermission,
): boolean {
  return getOrganizationPermissions(role).includes(permission);
}

export function isOrganizationWebRole(role: OrganizationRole | null | undefined): boolean {
  return role === 'account_owner' || role === 'admin' || role === 'dispatcher';
}

export function isAccountOwnerRole(role: OrganizationRole | null | undefined): boolean {
  return role === 'account_owner';
}

export function isOrganizationAdminRole(role: OrganizationRole | null | undefined): boolean {
  return role === 'account_owner' || role === 'admin';
}

export function isDriverRole(role: OrganizationRole | null | undefined): boolean {
  return role === 'driver';
}

/** Team invites never assign Account Owner — ownership is created or transferred. */
export const INVITABLE_ORGANIZATION_ROLES: readonly OrganizationRole[] = [
  'admin',
  'dispatcher',
] as const;

/** @deprecated Use OrganizationRole */
export type BusinessUserRole = OrganizationRole;
/** @deprecated Use OrganizationPermission — `manage_couriers` maps to `manage_drivers` */
export type BusinessPermission = OrganizationPermission | 'manage_couriers';

export const BUSINESS_USER_ROLE_LABELS = ORGANIZATION_ROLE_LABELS;
export const BUSINESS_USER_ROLES = ORGANIZATION_ROLES;

export function resolveBusinessUserRole(
  role: string | null | undefined,
): OrganizationRole {
  if (isOrganizationRole(role)) return role;
  if (
    role === 'logistics_manager' ||
    role === 'operations_staff' ||
    role === 'viewer' ||
    role === 'manager' ||
    role === 'logistics_employee'
  ) {
    return 'dispatcher';
  }
  return 'admin';
}

export function getBusinessPermissions(
  role: string | null | undefined,
): readonly OrganizationPermission[] {
  return getOrganizationPermissions(resolveBusinessUserRole(role));
}

export function hasBusinessPermission(
  role: OrganizationRole | string | null | undefined,
  permission: BusinessPermission,
): boolean {
  const mapped: OrganizationPermission =
    permission === 'manage_couriers' ? 'manage_drivers' : permission;
  return hasOrganizationPermission(resolveBusinessUserRole(role ?? null), mapped);
}

export function isCompanyAdminRole(role: string | null | undefined): boolean {
  return isOrganizationAdminRole(resolveBusinessUserRole(role));
}
