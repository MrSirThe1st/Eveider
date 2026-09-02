import { SERVICE_AREA_STATUS_LABELS, type ServiceAreaStatus } from '@eveider/domain';

export type ServiceAreaDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  status: ServiceAreaStatus;
  statusLabel: string;
  notes: string | null;
  lockerCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaOptionDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  label: string;
};

export function toServiceAreaDto(area: {
  id: string;
  code: string;
  name: string;
  city: string;
  status: ServiceAreaStatus;
  notes: string | null;
  lockerCount: number;
  createdAt: Date;
  updatedAt: Date;
}): ServiceAreaDto {
  return {
    id: area.id,
    code: area.code,
    name: area.name,
    city: area.city,
    status: area.status,
    statusLabel: SERVICE_AREA_STATUS_LABELS[area.status],
    notes: area.notes,
    lockerCount: area.lockerCount,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

export function toServiceAreaOptionDto(area: {
  id: string;
  code: string;
  name: string;
  city: string;
}): ServiceAreaOptionDto {
  return {
    id: area.id,
    code: area.code,
    name: area.name,
    city: area.city,
    label: `${area.name} (${area.city})`,
  };
}
