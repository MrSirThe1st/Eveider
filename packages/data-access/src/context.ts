import type {
  OrganizationPermission,
  OrganizationRole,
  PlatformRole,
} from '@eveider/domain';
import {
  canAdministerPlatform,
  hasOrganizationPermission,
  isDriverRole,
  isOrganizationWebRole,
  isSuperAdmin,
} from '@eveider/domain';

export type OrganizationMembershipRef = {
  organizationId: string;
  role: OrganizationRole;
};

export type DataAccessContext = {
  userId?: string;
  phone?: string;
  isCustomer: boolean;
  platformRole: PlatformRole | null;
  organizationId?: string;
  organizationRole?: OrganizationRole | null;
  memberships: OrganizationMembershipRef[];
  /** Present when the request is authenticated with an organisation API key. */
  apiKeyId?: string;
  /** @deprecated alias of organizationId for existing repository SQL */
  businessId?: string;
  /**
   * @deprecated derived persona for existing repository `ctx.role` branches.
   * Prefer platformRole / organizationRole / isCustomer.
   */
  role: 'admin' | 'business' | 'customer' | 'courier' | 'operator';
};

type ContextOptions = {
  userId?: string;
  phone?: string;
  isCustomer?: boolean;
  platformRole?: PlatformRole | null;
  organizationId?: string;
  organizationRole?: OrganizationRole | null;
  memberships?: OrganizationMembershipRef[];
  apiKeyId?: string;
  businessId?: string;
  businessUserRole?: OrganizationRole | string | null;
};

type LegacyRole = 'admin' | 'business' | 'customer' | 'courier' | 'operator' | 'driver';

function mapLegacyOrgRole(role: string | null | undefined): OrganizationRole {
  if (role === 'account_owner' || role === 'admin' || role === 'dispatcher' || role === 'driver') {
    return role;
  }
  if (role === 'logistics_manager' || role === 'operations_staff' || role === 'viewer' || role === 'manager') {
    return 'dispatcher';
  }
  return 'admin';
}

function fromLegacy(role: LegacyRole, extra?: ContextOptions): DataAccessContext {
  if (role === 'admin') {
    return fromOptions({
      ...extra,
      platformRole: extra?.platformRole ?? 'super_admin',
    });
  }
  if (role === 'operator') {
    return fromOptions({
      ...extra,
      organizationId: extra?.organizationId ?? extra?.businessId ?? 'eveider-org',
      organizationRole: 'dispatcher',
    });
  }
  if (role === 'customer') {
    return fromOptions({ ...extra, isCustomer: true });
  }
  if (role === 'courier' || role === 'driver') {
    return fromOptions({
      ...extra,
      organizationId: extra?.organizationId ?? extra?.businessId,
      organizationRole: 'driver',
    });
  }
  const organizationId = extra?.organizationId ?? extra?.businessId;
  return fromOptions({
    ...extra,
    organizationId,
    organizationRole: mapLegacyOrgRole(extra?.organizationRole ?? extra?.businessUserRole ?? 'admin'),
  });
}

function deriveLegacyRole(options?: ContextOptions): DataAccessContext['role'] {
  if (options?.platformRole) return 'admin';
  if (options?.organizationRole === 'driver') return 'courier';
  if (
    options?.organizationRole === 'account_owner' ||
    options?.organizationRole === 'admin' ||
    options?.organizationRole === 'dispatcher'
  ) {
    return 'business';
  }
  if (options?.businessUserRole) {
    return mapLegacyOrgRole(options.businessUserRole) === 'driver' ? 'courier' : 'business';
  }
  if (options?.isCustomer) return 'customer';
  return 'customer';
}

function fromOptions(options?: ContextOptions): DataAccessContext {
  const organizationId = options?.organizationId ?? options?.businessId;
  const organizationRole = options?.organizationRole
    ? mapLegacyOrgRole(options.organizationRole)
    : options?.businessUserRole
      ? mapLegacyOrgRole(options.businessUserRole)
      : null;
  const memberships =
    options?.memberships ??
    (organizationId && organizationRole
      ? [{ organizationId, role: organizationRole }]
      : []);

  const built = {
    userId: options?.userId,
    phone: options?.phone,
    isCustomer: options?.isCustomer ?? false,
    platformRole: options?.platformRole ?? null,
    organizationId,
    organizationRole,
    memberships,
    apiKeyId: options?.apiKeyId,
    businessId: organizationId,
  };

  return {
    ...built,
    role: deriveLegacyRole({
      ...options,
      platformRole: built.platformRole,
      organizationRole: built.organizationRole,
      isCustomer: built.isCustomer,
    }),
  };
}

export function createDataAccessContext(
  roleOrOptions?: LegacyRole | ContextOptions,
  extra?: ContextOptions,
): DataAccessContext {
  if (typeof roleOrOptions === 'string') {
    return fromLegacy(roleOrOptions, extra);
  }
  return fromOptions(roleOrOptions);
}

export class AccessDeniedError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export function isPlatformAdminContext(ctx: DataAccessContext): boolean {
  return canAdministerPlatform(ctx.platformRole);
}

export function assertAdmin(ctx: DataAccessContext): void {
  if (!isPlatformAdminContext(ctx)) {
    throw new AccessDeniedError('Admin role required');
  }
}

export function assertSuperAdmin(ctx: DataAccessContext): void {
  if (!isSuperAdmin(ctx.platformRole)) {
    throw new AccessDeniedError('Super administrateur requis');
  }
}

export function assertBusinessScope(ctx: DataAccessContext, businessId: string): void {
  if (isPlatformAdminContext(ctx)) return;
  if (ctx.organizationId === businessId) return;
  if (ctx.memberships.some((membership) => membership.organizationId === businessId)) return;
  throw new AccessDeniedError('Business scope violation');
}

export function assertCompanyPermission(
  ctx: DataAccessContext,
  permission: OrganizationPermission | 'manage_couriers',
): void {
  if (isPlatformAdminContext(ctx)) return;
  if (!ctx.organizationId || !isOrganizationWebRole(ctx.organizationRole)) {
    throw new AccessDeniedError('Autorisation insuffisante');
  }
  const mapped: OrganizationPermission =
    permission === 'manage_couriers' ? 'manage_drivers' : permission;
  if (!hasOrganizationPermission(ctx.organizationRole, mapped)) {
    throw new AccessDeniedError('Autorisation insuffisante');
  }
}

export function assertCustomerOwnsParcel(
  ctx: DataAccessContext,
  customerId: string | null | undefined,
  recipientPhone?: string,
): void {
  if (isPlatformAdminContext(ctx)) return;
  if (ctx.isCustomer && ctx.userId) {
    if (customerId === ctx.userId) return;
    if (recipientPhone && ctx.phone && recipientPhone === ctx.phone) return;
  }
  throw new AccessDeniedError('Customer scope violation');
}

export function assertCustomerRole(ctx: DataAccessContext): void {
  if (!ctx.isCustomer || !ctx.userId) {
    throw new AccessDeniedError('Customer role required');
  }
}

export function assertCourierRole(ctx: DataAccessContext): void {
  if (!ctx.userId || !isDriverRole(ctx.organizationRole)) {
    throw new AccessDeniedError('Driver role required');
  }
}

export function assertDriverRole(ctx: DataAccessContext): void {
  assertCourierRole(ctx);
}

export function assertBusinessRole(ctx: DataAccessContext): void {
  if (isPlatformAdminContext(ctx)) return;
  if (!ctx.userId || !ctx.organizationId || !isOrganizationWebRole(ctx.organizationRole)) {
    throw new AccessDeniedError('Organization role required');
  }
}
