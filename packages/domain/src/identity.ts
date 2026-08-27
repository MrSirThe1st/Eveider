import {
  canAdministerPlatform,
  type PlatformRole,
  type UserRole,
} from './roles.js';
import {
  isDriverRole,
  isOrganizationWebRole,
  type OrganizationRole,
} from './organization-roles.js';

export type MembershipRef = {
  organizationId: string;
  role: OrganizationRole;
  isPlatformOrg?: boolean;
};

export function isMobileDriver(memberships: readonly MembershipRef[]): boolean {
  return memberships.some((membership) => isDriverRole(membership.role));
}

export function hasOrganizationWebAccess(memberships: readonly MembershipRef[]): boolean {
  return memberships.some(
    (membership) => !membership.isPlatformOrg && isOrganizationWebRole(membership.role),
  );
}

export function hasPlatformDashboardAccess(
  platformRole: PlatformRole | null | undefined,
  memberships: readonly MembershipRef[] = [],
): boolean {
  if (canAdministerPlatform(platformRole)) return true;
  return memberships.some(
    (membership) => membership.isPlatformOrg === true && membership.role === 'dispatcher',
  );
}

/** Persona for `/api/auth/me` and app shells. Driver wins over customer on mobile. */
export function deriveUserRole(input: {
  isCustomer: boolean;
  platformRole: PlatformRole | null;
  memberships: readonly MembershipRef[];
  surface: 'mobile' | 'web';
}): UserRole | null {
  if (input.surface === 'mobile') {
    if (isMobileDriver(input.memberships)) return 'driver';
    if (input.isCustomer) return 'customer';
    return null;
  }

  if (hasPlatformDashboardAccess(input.platformRole, input.memberships)) {
    return 'admin';
  }
  if (hasOrganizationWebAccess(input.memberships)) {
    return 'organization';
  }
  return null;
}

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  if (role === 'courier') return 'driver';
  if (role === 'business') return 'organization';
  if (role === 'customer' || role === 'driver' || role === 'organization' || role === 'admin') {
    return role;
  }
  return null;
}
