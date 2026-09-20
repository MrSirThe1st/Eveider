import { SERVICE_AREA_STATUS_LABELS, type ServiceAreaStatus } from '@eveider/domain';
import { formatZoneCoverageLabel } from '@/lib/geography-presentation';

export type ServiceAreaDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  cityId: string;
  status: ServiceAreaStatus;
  statusLabel: string;
  notes: string | null;
  lockerCount: number;
  outboundDeliveryAmount: number | null;
  returnDeliveryAmount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaOptionDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  cityId: string;
  label: string;
};

export function toServiceAreaDto(area: {
  id: string;
  code: string;
  name: string;
  city: string;
  cityId: string;
  status: ServiceAreaStatus;
  notes: string | null;
  lockerCount: number;
  createdAt: Date;
  updatedAt: Date;
  outboundDeliveryAmount?: number | null;
  returnDeliveryAmount?: number | null;
}): ServiceAreaDto {
  return {
    id: area.id,
    code: area.code,
    name: area.name,
    city: area.city,
    cityId: area.cityId,
    status: area.status,
    statusLabel: SERVICE_AREA_STATUS_LABELS[area.status],
    notes: area.notes,
    lockerCount: area.lockerCount,
    outboundDeliveryAmount: area.outboundDeliveryAmount ?? null,
    returnDeliveryAmount: area.returnDeliveryAmount ?? null,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

export function toServiceAreaOptionDto(area: {
  id: string;
  code: string;
  name: string;
  city: string;
  cityId: string;
}): ServiceAreaOptionDto {
  return {
    id: area.id,
    code: area.code,
    name: area.name,
    city: area.city,
    cityId: area.cityId,
    label: formatZoneCoverageLabel(area),
  };
}
