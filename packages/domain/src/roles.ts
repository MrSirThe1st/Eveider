/**
 * DB / runtime role values — stored in PostgreSQL `users.role`.
 * Do NOT rename these without a dedicated data migration.
 */
export type UserRole = 'customer' | 'courier' | 'business' | 'admin' | 'operator';

export const USER_ROLES: readonly UserRole[] = [
  'customer',
  'courier',
  'business',
  'admin',
  'operator',
] as const;

/**
 * API / product-facing role aliases.
 * Map to DB values via `toDbRole` / `toApiRole`.
 *
 * OPERATOR is stored in DB but has no dedicated web/mobile UI yet.
 * Prefer admin tooling / SQL to assign it until product flows ship.
 */
export type ApiUserRole =
  | 'PLATFORM_ADMIN'
  | 'BUSINESS_ADMIN'
  | 'OPERATOR'
  | 'CUSTOMER'
  | 'COURIER';

export const OPERATOR_ROLE_SCAFFOLD = 'OPERATOR' as const satisfies ApiUserRole;

const DB_TO_API: Record<UserRole, ApiUserRole> = {
  admin: 'PLATFORM_ADMIN',
  business: 'BUSINESS_ADMIN',
  operator: 'OPERATOR',
  customer: 'CUSTOMER',
  courier: 'COURIER',
};

const API_TO_DB: Record<ApiUserRole, UserRole> = {
  PLATFORM_ADMIN: 'admin',
  BUSINESS_ADMIN: 'business',
  OPERATOR: 'operator',
  CUSTOMER: 'customer',
  COURIER: 'courier',
};

export function toApiRole(role: UserRole): ApiUserRole {
  return DB_TO_API[role];
}

export function toDbRole(role: ApiUserRole): UserRole {
  return API_TO_DB[role];
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export function isBusinessRole(role: UserRole): boolean {
  return role === 'business';
}

export function isOperatorRole(role: UserRole): boolean {
  return role === 'operator';
}

/** Platform ops staff (admin or operator) — not business tenants. */
export function isPlatformStaff(role: UserRole): boolean {
  return role === 'admin' || role === 'operator';
}

export function canSubmitParcels(role: UserRole): boolean {
  return role === 'business' || role === 'admin';
}

export function canManageDeliveries(role: UserRole): boolean {
  return role === 'courier' || role === 'admin' || role === 'operator';
}

export function canViewPickupPin(role: UserRole): boolean {
  return role === 'customer' || role === 'admin' || role === 'operator';
}

/** Review KYC / business applications — admin only until operator UI exists. */
export function canReviewBusinessApplications(role: UserRole): boolean {
  return role === 'admin';
}

/** Manage lockers / compartments — admin only until operator UI exists. */
export function canManageLockers(role: UserRole): boolean {
  return role === 'admin';
}
