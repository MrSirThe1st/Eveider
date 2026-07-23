import {
  COMPARTMENT_STATUS_LABELS,
  LOCKER_STATUS_LABELS,
  LOCKER_TYPE_LABELS,
  usesCompartmentGrid,
  usesSoftCapacity,
  type CompartmentStatus,
  type CommissionType,
  type LockerStatus,
  type LockerType,
} from '@eveider/domain';

export type CompartmentCountsDto = {
  available: number;
  occupied: number;
  reserved: number;
  total: number;
};

export type LockerSummaryDto = {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type: LockerType;
  typeLabel: string;
  maxCapacity: number | null;
  contactPhone: string | null;
  contactName: string | null;
  notes: string | null;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  commissionCurrency: string | null;
  occupyingCount: number;
  availableSlots: number;
  status: LockerStatus;
  statusLabel: string;
  compartmentCounts: CompartmentCountsDto;
};

export type LockerMapMarkerDto = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: LockerType;
  typeLabel: string;
  status: LockerStatus;
  statusLabel: string;
  availableCompartments: number;
  availableSlots: number;
  availableBySize?: { small: number; medium: number; large: number };
  rows: number;
  columns: number;
  distanceKm?: number;
  contactPhone?: string | null;
};

export type CompartmentDto = {
  id: string;
  label: string;
  size: 'small' | 'medium' | 'large';
  status: CompartmentStatus;
  statusLabel: string;
};

export type LockerDetailDto = {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type: LockerType;
  typeLabel: string;
  maxCapacity: number | null;
  contactPhone: string | null;
  contactName: string | null;
  notes: string | null;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  commissionCurrency: string | null;
  occupyingCount: number;
  availableSlots: number;
  status: LockerStatus;
  statusLabel: string;
  compartments: CompartmentDto[];
  compartmentCounts: CompartmentCountsDto;
};

function pointFields(locker: {
  type?: LockerType;
  maxCapacity?: number | null;
  contactPhone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
  occupyingCount?: number;
  availableSlots?: number;
  availableCompartments?: number;
}) {
  const type = locker.type ?? 'SMART_LOCKER';
  const occupyingCount = locker.occupyingCount ?? 0;
  const availableSlots =
    locker.availableSlots ??
    (usesCompartmentGrid(type)
      ? (locker.availableCompartments ?? 0)
      : Math.max(0, (locker.maxCapacity ?? 0) - occupyingCount));

  return {
    type,
    typeLabel: LOCKER_TYPE_LABELS[type],
    maxCapacity: locker.maxCapacity ?? null,
    contactPhone: locker.contactPhone ?? null,
    contactName: locker.contactName ?? null,
    notes: locker.notes ?? null,
    commissionType: locker.commissionType ?? null,
    commissionValue: locker.commissionValue ?? null,
    commissionCurrency: locker.commissionCurrency ?? null,
    occupyingCount,
    availableSlots,
  };
}

export function toLockerMapMarkerDto(locker: {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type?: LockerType;
  status: LockerStatus;
  availableCompartments: number;
  availableSlots?: number;
  occupyingCount?: number;
  maxCapacity?: number | null;
  contactPhone?: string | null;
  availableBySize?: { small: number; medium: number; large: number };
  distanceKm?: number;
}): LockerMapMarkerDto | null {
  if (locker.latitude == null || locker.longitude == null) {
    return null;
  }

  const fields = pointFields(locker);

  return {
    id: locker.id,
    name: locker.name,
    address: locker.address,
    latitude: locker.latitude,
    longitude: locker.longitude,
    rows: locker.rows,
    columns: locker.columns,
    status: locker.status,
    statusLabel: LOCKER_STATUS_LABELS[locker.status],
    availableCompartments: locker.availableCompartments,
    availableBySize: locker.availableBySize,
    distanceKm: locker.distanceKm,
    contactPhone: fields.contactPhone,
    type: fields.type,
    typeLabel: fields.typeLabel,
    availableSlots: fields.availableSlots,
  };
}

export function toLockerSummaryDto(locker: {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type?: LockerType;
  maxCapacity?: number | null;
  contactPhone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
  occupyingCount?: number;
  availableSlots?: number;
  status: LockerStatus;
  compartmentCounts: CompartmentCountsDto;
}): LockerSummaryDto {
  const fields = pointFields({
    ...locker,
    availableCompartments: locker.compartmentCounts.available,
  });

  return {
    id: locker.id,
    code: locker.code,
    name: locker.name,
    address: locker.address,
    latitude: locker.latitude,
    longitude: locker.longitude,
    rows: locker.rows,
    columns: locker.columns,
    status: locker.status,
    statusLabel: LOCKER_STATUS_LABELS[locker.status],
    compartmentCounts: locker.compartmentCounts,
    ...fields,
  };
}

export function toLockerDetailDto(locker: {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type?: LockerType;
  maxCapacity?: number | null;
  contactPhone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
  occupyingCount?: number;
  availableSlots?: number;
  status: LockerStatus;
  compartments: { id: string; label: string; size: 'small' | 'medium' | 'large'; status: CompartmentStatus }[];
}): LockerDetailDto {
  const compartmentCounts = {
    available: locker.compartments.filter((c) => c.status === 'available').length,
    occupied: locker.compartments.filter((c) => c.status === 'occupied').length,
    reserved: locker.compartments.filter((c) => c.status === 'reserved').length,
    total: locker.compartments.length,
  };

  const fields = pointFields({
    ...locker,
    availableCompartments: compartmentCounts.available,
  });

  return {
    id: locker.id,
    code: locker.code,
    name: locker.name,
    address: locker.address,
    latitude: locker.latitude,
    longitude: locker.longitude,
    rows: locker.rows,
    columns: locker.columns,
    status: locker.status,
    statusLabel: LOCKER_STATUS_LABELS[locker.status],
    compartmentCounts,
    compartments: locker.compartments.map((compartment) => ({
      id: compartment.id,
      label: compartment.label,
      size: compartment.size,
      status: compartment.status,
      statusLabel: COMPARTMENT_STATUS_LABELS[compartment.status],
    })),
    ...fields,
  };
}

export { usesCompartmentGrid, usesSoftCapacity };
