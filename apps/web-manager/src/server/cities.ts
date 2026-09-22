import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { CityStatus } from '@eveider/domain';
import {
  toCityDto,
  toCityOptionDto,
  toDrcCatalogCityDto,
  type CityDto,
  type CityOptionDto,
  type DrcCatalogCityDto,
} from '@/lib/city-presenter';

export type { CityDto, CityOptionDto, DrcCatalogCityDto };

export async function listCities(
  ctx: DataAccessContext,
  options?: { status?: CityStatus; includeArchived?: boolean },
): Promise<CityDto[]> {
  const { cities } = createRepositories();
  const items = await cities.list(ctx, options);
  return items.map(toCityDto);
}

export async function listCityOptions(): Promise<CityOptionDto[]> {
  const { cities } = createRepositories();
  const items = await cities.listActiveOptions();
  return items.map(toCityOptionDto);
}

export async function listDrcCatalog(): Promise<DrcCatalogCityDto[]> {
  const { cities } = createRepositories();
  const items = await cities.listCatalog();
  return items.map(toDrcCatalogCityDto);
}
