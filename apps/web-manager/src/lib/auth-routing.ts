import type { UserRole } from '@eveider/domain';

export const WEB_ROUTES = {
  landing: '/',
  login: '/connexion',
  register: '/inscription',
  adminDashboard: '/tableau-de-bord',
  businessDashboard: '/entreprise/tableau-de-bord',
  businessNewParcel: '/entreprise/tableau-de-bord/colis/nouveau',
} as const;

export function businessParcelPath(parcelId: string) {
  return `/entreprise/tableau-de-bord/colis/${parcelId}`;
}

export function isMobileRole(role: UserRole) {
  return role === 'customer' || role === 'courier';
}

export function isSafeRedirect(path: string | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/connexion') || path.startsWith('/inscription')) return false;
  return true;
}

function normalizeRedirectParam(redirectParam?: string): string | undefined {
  if (!redirectParam) return undefined;

  if (isSafeRedirect(redirectParam)) {
    return redirectParam;
  }

  try {
    const url = new URL(redirectParam);
    const path = `${url.pathname}${url.search}`;
    return isSafeRedirect(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

function isRedirectAllowedForRole(path: string, role: UserRole): boolean {
  if (role === 'admin') {
    return path.startsWith(WEB_ROUTES.adminDashboard);
  }
  if (role === 'business') {
    return path.startsWith('/entreprise/');
  }
  return false;
}

export function getPostLoginPath(role: UserRole, redirectParam?: string): string {
  const normalized = normalizeRedirectParam(redirectParam);
  if (normalized && isRedirectAllowedForRole(normalized, role)) {
    return normalized;
  }

  switch (role) {
    case 'admin':
      return WEB_ROUTES.adminDashboard;
    case 'business':
      return WEB_ROUTES.businessDashboard;
    case 'operator':
      // No operator UI yet — land on marketing until product flows exist.
      return WEB_ROUTES.landing;
    default:
      // Customer / courier use the mobile app — never redirect `/` → `/` (infinite loop).
      return WEB_ROUTES.landing;
  }
}

/**
 * Web dashboard destination after login, or `null` when the role has no web shell
 * (customer / courier). Callers must not `redirect()` to `/` when already on `/`.
 */
export function getAuthenticatedLandingPath(role: UserRole): string | null {
  if (isMobileRole(role)) {
    return null;
  }
  return getPostLoginPath(role);
}
