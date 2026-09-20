import { CITY_STATUS_LABELS, type CityStatus } from '@eveider/domain';

export type CityDto = {
  id: string;
  code: string;
  name: string;
  status: CityStatus;
  statusLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CityOptionDto = {
  id: string;
  code: string;
  name: string;
};

export function toCityDto(city: {
  id: string;
  code: string;
  name: string;
  status: CityStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CityDto {
  return {
    id: city.id,
    code: city.code,
    name: city.name,
    status: city.status,
    statusLabel: CITY_STATUS_LABELS[city.status],
    notes: city.notes,
    createdAt: city.createdAt.toISOString(),
    updatedAt: city.updatedAt.toISOString(),
  };
}

export function toCityOptionDto(city: { id: string; code: string; name: string }): CityOptionDto {
  return {
    id: city.id,
    code: city.code,
    name: city.name,
  };
}
