import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import {
  toServiceAreaDto,
  toServiceAreaOptionDto,
  type ServiceAreaDto,
  type ServiceAreaOptionDto,
} from '@/lib/service-area-presenter';

export type { ServiceAreaDto, ServiceAreaOptionDto };

export async function listServiceAreas(
  ctx: DataAccessContext,
  options?: { status?: 'active' | 'archived'; city?: string; includeArchived?: boolean },
): Promise<ServiceAreaDto[]> {
  const { serviceAreas } = createRepositories();
  const items = await serviceAreas.list(ctx, options);
  return items.map(toServiceAreaDto);
}

export async function listServiceAreaOptions(ctx: DataAccessContext): Promise<ServiceAreaOptionDto[]> {
  const { serviceAreas } = createRepositories();
  const items = await serviceAreas.listActiveOptions(ctx);
  return items.map(toServiceAreaOptionDto);
}

export async function getServiceArea(
  ctx: DataAccessContext,
  id: string,
): Promise<ServiceAreaDto | null> {
  const { serviceAreas } = createRepositories();
  const area = await serviceAreas.findById(ctx, id);
  return area ? toServiceAreaDto(area) : null;
}
