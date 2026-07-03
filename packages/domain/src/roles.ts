export type UserRole = 'customer' | 'courier' | 'business' | 'admin';

export const USER_ROLES: readonly UserRole[] = ['customer', 'courier', 'business', 'admin'] as const;

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export function isBusinessRole(role: UserRole): boolean {
  return role === 'business';
}

export function canSubmitParcels(role: UserRole): boolean {
  return role === 'business' || role === 'admin';
}

export function canManageDeliveries(role: UserRole): boolean {
  return role === 'courier' || role === 'admin';
}

export function canViewPickupPin(role: UserRole): boolean {
  return role === 'customer' || role === 'admin';
}
