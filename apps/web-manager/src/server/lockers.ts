import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import {
  toBusinessLockerDto,
  toLockerSummaryDto,
  type BusinessLockerDto,
  type LockerSummaryDto,
} from '@/lib/locker-presenter';
import { toPickupLocationDto, type PickupLocationDto } from '@/lib/pickup-location-presenter';

export type { LockerSummaryDto, BusinessLockerDto };

export type BusinessPointsPageData = {
  lockers: BusinessLockerDto[];
  pickupLocations: PickupLocationDto[];
};

export async function listLockers(
  ctx: DataAccessContext,
  options?: { search?: string; serviceAreaId?: string; city?: string },
): Promise<LockerSummaryDto[]> {
  const { lockers } = createRepositories();
  const items = await lockers.listAll(ctx, options);
  return items.map(toLockerSummaryDto);
}

export async function loadBusinessPointsPageData(
  businessId: string,
): Promise<BusinessPointsPageData> {
  const { lockers, businessOnboarding, pricing } = createRepositories();
  const [points, pickupRows, rules] = await Promise.all([
    lockers.listNetworkDirectoryWithPricing(),
    businessOnboarding.listPickupLocations(businessId),
    pricing.getDeliveryRules(),
  ]);

  return {
    lockers: points.map((point) => toBusinessLockerDto(point, rules.currency)),
    pickupLocations: pickupRows.map(toPickupLocationDto),
  };
}

/** @deprecated Prefer loadBusinessPointsPageData for the Points map. */
export async function listBusinessNetworkLockers(): Promise<BusinessLockerDto[]> {
  const { lockers, pricing } = createRepositories();
  const [items, rules] = await Promise.all([
    lockers.listNetworkDirectoryWithPricing(),
    pricing.getDeliveryRules(),
  ]);
  return items.map((item) => toBusinessLockerDto(item, rules.currency));
}
