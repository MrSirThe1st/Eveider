import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import { toLockerSummaryDto, type LockerSummaryDto } from '@/lib/locker-presenter';

export type { LockerSummaryDto };

export async function listLockers(
  ctx: DataAccessContext,
  options?: { search?: string },
): Promise<LockerSummaryDto[]> {
  const { lockers } = createRepositories();
  const items = await lockers.listAll(ctx, options);
  return items.map(toLockerSummaryDto);
}
