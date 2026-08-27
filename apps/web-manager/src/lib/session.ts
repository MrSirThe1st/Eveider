import {
  AccessDeniedError,
  createDataAccessContext,
  type DataAccessContext,
} from '@eveider/data-access';
import type { OrganizationPermission, OrganizationRole } from '@eveider/domain';
import {
  hasOrganizationPermission,
  hasOrganizationWebAccess,
  hasPlatformDashboardAccess,
  isOrganizationWebRole,
} from '@eveider/domain';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { CurrentMembership, CurrentUser } from '@/lib/auth/resolve-current-user';
import type { PerfTimer } from '@/lib/perf/request-timer';

const ORGANIZATION_COOKIE = 'eveider-organization-id';

async function measure<T>(perf: PerfTimer | undefined, label: string, fn: () => Promise<T>): Promise<T> {
  if (perf) return perf.measure(label, fn);
  return fn();
}

function webMemberships(memberships: CurrentMembership[]) {
  return memberships.filter(
    (membership) => !membership.isPlatformOrg && isOrganizationWebRole(membership.role),
  );
}

export function pickOrganizationMembership(
  current: CurrentUser,
  preferredOrganizationId?: string | null,
): CurrentMembership | null {
  const eligible = webMemberships(current.memberships);
  if (preferredOrganizationId) {
    const match = eligible.find((membership) => membership.businessId === preferredOrganizationId);
    if (match) return match;
  }
  return eligible[0] ?? null;
}

export type AdminSession = {
  authId: string;
  profile: {
    id: string;
    role: 'admin';
    email: string | null;
    fullName: string | null;
  };
  ctx: DataAccessContext;
};

export async function requireAdminSession(
  perf?: PerfTimer,
): Promise<{ session: AdminSession } | { error: string; status: number }> {
  const current = await measure(perf, 'auth.resolveCurrentUser', () => getCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    if (
      !hasPlatformDashboardAccess(
        current.profile.platformRole,
        current.memberships.map((membership) => ({
          organizationId: membership.businessId,
          role: membership.role,
          isPlatformOrg: membership.isPlatformOrg,
        })),
      )
    ) {
      throw new AccessDeniedError('Rôle non autorisé pour cette application');
    }

    const platformOrg = current.memberships.find((membership) => membership.isPlatformOrg);
    const ctx = createDataAccessContext({
      userId: current.profile.id,
      platformRole: current.profile.platformRole,
      organizationId: platformOrg?.businessId,
      organizationRole: platformOrg?.role,
      memberships: current.memberships.map((membership) => ({
        organizationId: membership.businessId,
        role: membership.role,
      })),
    });

    return {
      session: {
        authId: current.authUser.id,
        profile: {
          id: current.profile.id,
          role: 'admin',
          email: current.profile.email,
          fullName: current.profile.fullName,
        },
        ctx,
      },
    };
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 };
  }
}

export type BusinessSession = {
  authId: string;
  profile: {
    id: string;
    businessId: string;
    role: 'organization';
    userRole: OrganizationRole;
    email: string | null;
  };
  ctx: DataAccessContext;
};

export async function requireBusinessSession(
  perf?: PerfTimer,
  permission?: OrganizationPermission,
): Promise<{ session: BusinessSession } | { error: string; status: number }> {
  const current = await measure(perf, 'auth.resolveCurrentUser', () => getCurrentUser());

  if (!current) {
    return { error: 'Non authentifié', status: 401 };
  }

  try {
    if (
      !hasOrganizationWebAccess(
        current.memberships.map((membership) => ({
          organizationId: membership.businessId,
          role: membership.role,
          isPlatformOrg: membership.isPlatformOrg,
        })),
      )
    ) {
      throw new AccessDeniedError('Rôle non autorisé pour cette application');
    }

    const cookieStore = await cookies();
    const membership = pickOrganizationMembership(
      current,
      cookieStore.get(ORGANIZATION_COOKIE)?.value,
    );
    if (!membership) {
      return { error: 'Compte organisation requis', status: 403 };
    }

    const requiredPermission =
      permission === 'manage_couriers' ? 'manage_drivers' : permission;
    if (requiredPermission && !hasOrganizationPermission(membership.role, requiredPermission)) {
      throw new AccessDeniedError('Autorisation insuffisante');
    }

    const ctx = createDataAccessContext({
      userId: current.profile.id,
      organizationId: membership.businessId,
      organizationRole: membership.role,
      memberships: current.memberships.map((item) => ({
        organizationId: item.businessId,
        role: item.role,
      })),
    });

    return {
      session: {
        authId: current.authUser.id,
        profile: {
          id: current.profile.id,
          businessId: membership.businessId,
          role: 'organization',
          userRole: membership.role,
          email: current.profile.email,
        },
        ctx,
      },
    };
  } catch (err) {
    const message = err instanceof AccessDeniedError ? err.message : 'Accès refusé';
    return { error: message, status: 403 };
  }
}
