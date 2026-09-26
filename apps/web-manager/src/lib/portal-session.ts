import type { DataAccessContext } from '@eveider/data-access';
import { requireAdminSession, requireBusinessSession } from '@/lib/session';

export type PortalSession =
  | { kind: 'admin'; userId: string; ctx: DataAccessContext }
  | { kind: 'organization'; userId: string; businessId: string; ctx: DataAccessContext };

export async function requirePortalSession(): Promise<
  { session: PortalSession } | { error: string; status: number }
> {
  const admin = await requireAdminSession();
  if ('session' in admin) {
    return {
      session: {
        kind: 'admin',
        userId: admin.session.profile.id,
        ctx: admin.session.ctx,
      },
    };
  }

  const business = await requireBusinessSession();
  if ('session' in business) {
    return {
      session: {
        kind: 'organization',
        userId: business.session.profile.id,
        businessId: business.session.profile.businessId,
        ctx: business.session.ctx,
      },
    };
  }

  return admin.status <= business.status ? admin : business;
}
