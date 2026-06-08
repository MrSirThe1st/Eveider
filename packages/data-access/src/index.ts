import type { UserRole } from '@eveider/domain';

/** Placeholder — Prisma client and repositories land in Step 3. */
export type DataAccessContext = {
  role: UserRole;
  businessId?: string;
};

export function createDataAccessContext(role: UserRole, businessId?: string): DataAccessContext {
  return { role, businessId };
}
