import {
  deriveUserRole,
  normalizeUserRole,
  type UserRole,
} from '@eveider/domain';
import type { CurrentUser } from '@/lib/auth/resolve-current-user';

export const WEB_ROUTES = {
  landing: '/',
  login: '/connexion',
  register: '/inscription',
  adminDashboard: '/tableau-de-bord',
  businessDashboard: '/organisation/tableau-de-bord',
  businessParcels: '/organisation/tableau-de-bord/colis',
  businessNewParcel: '/organisation/tableau-de-bord/colis/nouveau',
  businessLockers: '/organisation/tableau-de-bord/points',
  businessIssues: '/organisation/tableau-de-bord/incidents',
  businessSettings: '/organisation/tableau-de-bord/parametres',
  businessBilling: '/organisation/tableau-de-bord/facturation',
  businessTeam: '/organisation/tableau-de-bord/equipe',
  businessCouriers: '/organisation/tableau-de-bord/chauffeurs',
} as const;

export function businessParcelPath(parcelId: string) {
  return `/organisation/tableau-de-bord/colis/${parcelId}`;
}

export function businessNewParcelPath(lockerId?: string) {
  if (!lockerId) return WEB_ROUTES.businessNewParcel;
  return `${WEB_ROUTES.businessNewParcel}?lockerId=${encodeURIComponent(lockerId)}`;
}

export function isMobileRole(role: UserRole | string) {
  const normalized = normalizeUserRole(role);
  return normalized === 'customer' || normalized === 'driver';
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
  if (role === 'organization') {
    return path.startsWith('/organisation/') || path.startsWith('/organisation/');
  }
  return false;
}

export function getPostLoginPath(role: UserRole | string, redirectParam?: string): string {
  const normalized = normalizeUserRole(role) ?? 'customer';
  const safeRole = normalized;
  const mapped = redirectParam;
  const normalizedRedirect = normalizeRedirectParam(mapped);
  if (normalizedRedirect && isRedirectAllowedForRole(normalizedRedirect, safeRole)) {
    return normalizedRedirect;
  }

  switch (safeRole) {
    case 'admin':
      return WEB_ROUTES.adminDashboard;
    case 'organization':
      return WEB_ROUTES.businessDashboard;
    default:
      return WEB_ROUTES.landing;
  }
}

export function getAuthenticatedLandingPath(role: UserRole | string): string | null {
  if (isMobileRole(role)) {
    return null;
  }
  return getPostLoginPath(role);
}

export function getLandingPathForUser(current: CurrentUser): string | null {
  const persona = deriveUserRole({
    isCustomer: current.profile.isCustomer,
    platformRole: current.profile.platformRole,
    memberships: current.memberships.map((membership) => ({
      organizationId: membership.businessId,
      role: membership.role,
      isPlatformOrg: membership.isPlatformOrg,
    })),
    surface: 'web',
  });
  if (!persona) return null;
  return getAuthenticatedLandingPath(persona);
}
