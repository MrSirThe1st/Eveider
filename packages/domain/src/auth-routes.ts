import type { UserRole } from './roles.js';

/** Dashboard path after web login, by role. Mobile roles return null. */
export function getWebDashboardPath(role: UserRole): string | null {
  switch (role) {
    case 'admin':
      return '/tableau-de-bord';
    case 'business':
      return '/entreprise/tableau-de-bord';
    default:
      return null;
  }
}

export function isWebRole(role: UserRole): boolean {
  return role === 'admin' || role === 'business';
}
