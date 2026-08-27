/**
 * Platform-level staff — stored in PostgreSQL `users.platform_role`.
 * Independent from organization membership and from the customer flag.
 */
export type PlatformRole = 'super_admin' | 'admin';

export const PLATFORM_ROLES: readonly PlatformRole[] = ['super_admin', 'admin'] as const;

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: 'Super administrateur',
  admin: 'Administrateur',
};

export function isPlatformRole(value: string | null | undefined): value is PlatformRole {
  return value === 'super_admin' || value === 'admin';
}

export function isPlatformStaff(role: PlatformRole | null | undefined): boolean {
  return isPlatformRole(role);
}

export function isSuperAdmin(role: PlatformRole | null | undefined): boolean {
  return role === 'super_admin';
}

/** Platform admin tools (KYC, lockers, all organizations). Super Admin included. */
export function canAdministerPlatform(role: PlatformRole | null | undefined): boolean {
  return isPlatformStaff(role);
}

export function canManageLockers(role: PlatformRole | null | undefined): boolean {
  return isPlatformStaff(role);
}

export function canReviewOrganizationApplications(role: PlatformRole | null | undefined): boolean {
  return isPlatformStaff(role);
}

/**
 * App persona derived at the API boundary — not stored on `users`.
 * `courier` / `business` remain accepted aliases in older clients.
 */
export const USER_ROLES = ['customer', 'driver', 'organization', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LEGACY_USER_ROLES = ['customer', 'courier', 'business', 'admin', 'operator'] as const;
