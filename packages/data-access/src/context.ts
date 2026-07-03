import type { UserRole } from '@eveider/domain';

export type DataAccessContext = {
  role: UserRole;
  userId?: string;
  businessId?: string;
  phone?: string;
};

export function createDataAccessContext(
  role: UserRole,
  options?: { userId?: string; businessId?: string; phone?: string },
): DataAccessContext {
  return {
    role,
    userId: options?.userId,
    businessId: options?.businessId,
    phone: options?.phone,
  };
}

export class AccessDeniedError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export function assertAdmin(ctx: DataAccessContext): void {
  if (ctx.role !== 'admin') {
    throw new AccessDeniedError('Admin role required');
  }
}

export function assertBusinessScope(ctx: DataAccessContext, businessId: string): void {
  if (ctx.role === 'admin') return;
  if (ctx.role === 'business' && ctx.businessId === businessId) return;
  throw new AccessDeniedError('Business scope violation');
}

export function assertCustomerOwnsParcel(
  ctx: DataAccessContext,
  customerId: string | null | undefined,
  recipientPhone?: string,
): void {
  if (ctx.role === 'admin') return;
  if (ctx.role === 'customer' && ctx.userId) {
    if (customerId === ctx.userId) return;
    if (recipientPhone && ctx.phone && recipientPhone === ctx.phone) return;
  }
  throw new AccessDeniedError('Customer scope violation');
}

export function assertCustomerRole(ctx: DataAccessContext): void {
  if (ctx.role !== 'customer' || !ctx.userId) {
    throw new AccessDeniedError('Customer role required');
  }
}

export function assertCourierRole(ctx: DataAccessContext): void {
  if (ctx.role !== 'courier' || !ctx.userId) {
    throw new AccessDeniedError('Courier role required');
  }
}
