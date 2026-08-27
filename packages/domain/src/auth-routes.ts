import type { UserRole } from './roles.js';
import { normalizeUserRole } from './identity.js';

/** Dashboard path after web login, by derived persona. Mobile personas return null. */
export function getWebDashboardPath(role: UserRole | string): string | null {
  const normalized = normalizeUserRole(role);
  switch (normalized) {
    case 'admin':
      return '/tableau-de-bord';
    case 'organization':
      return '/organisation/tableau-de-bord';
    default:
      return null;
  }
}

export function isWebRole(role: UserRole | string): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'admin' || normalized === 'organization';
}
