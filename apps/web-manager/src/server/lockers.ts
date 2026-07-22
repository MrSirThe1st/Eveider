import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import { toLockerSummaryDto, type LockerSummaryDto } from '@/lib/locker-presenter';

export type { LockerSummaryDto };

export async function listLockers(ctx: DataAccessContext): Promise<LockerSummaryDto[]> {
  const { lockers } = createRepositories();
  const items = await lockers.listAll(ctx);
  return items.map(toLockerSummaryDto);
}
