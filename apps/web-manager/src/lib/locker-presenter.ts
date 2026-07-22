import {
  COMPARTMENT_STATUS_LABELS,
  LOCKER_STATUS_LABELS,
  type CompartmentStatus,
  type LockerStatus,
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
  status: LockerStatus;
  statusLabel: string;
  availableCompartments: number;
  availableBySize?: { small: number; medium: number; large: number };
  rows: number;
  columns: number;
  distanceKm?: number;
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
  status: LockerStatus;
  statusLabel: string;
  compartments: CompartmentDto[];
  compartmentCounts: CompartmentCountsDto;
};

export function toLockerMapMarkerDto(locker: {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  status: LockerStatus;
  availableCompartments: number;
  availableBySize?: { small: number; medium: number; large: number };
  distanceKm?: number;
}): LockerMapMarkerDto | null {
  if (locker.latitude == null || locker.longitude == null) {
    return null;
  }

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
  status: LockerStatus;
  compartmentCounts: CompartmentCountsDto;
}): LockerSummaryDto {
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
  status: LockerStatus;
  compartments: { id: string; label: string; size: 'small' | 'medium' | 'large'; status: CompartmentStatus }[];
}): LockerDetailDto {
  const compartmentCounts = {
    available: locker.compartments.filter((c) => c.status === 'available').length,
    occupied: locker.compartments.filter((c) => c.status === 'occupied').length,
    reserved: locker.compartments.filter((c) => c.status === 'reserved').length,
    total: locker.compartments.length,
  };

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
  };
}
