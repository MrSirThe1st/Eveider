import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import {
  toBusinessLockerDto,
  toLockerSummaryDto,
  type BusinessLockerDto,
  type LockerSummaryDto,
} from '@/lib/locker-presenter';

export type { LockerSummaryDto, BusinessLockerDto };

export async function listLockers(
  ctx: DataAccessContext,
  options?: { search?: string; serviceAreaId?: string; city?: string },
): Promise<LockerSummaryDto[]> {
  const { lockers } = createRepositories();
  const items = await lockers.listAll(ctx, options);
  return items.map(toLockerSummaryDto);
}

export async function listBusinessNetworkLockers(): Promise<BusinessLockerDto[]> {
  const { lockers } = createRepositories();
  const items = await lockers.listNetworkDirectory();
  return items.map(toBusinessLockerDto);
}
