import { cache } from 'react';
import type { DataAccessContext, DriverRosterRecord } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import {
  DELIVERY_STATUS_LABELS,
  DRIVER_DOSSIER_STATUS_LABELS,
  DRIVER_OPERATIONAL_STATUS_LABELS,
  deriveDriverOperationalStatus,
  type DeliveryStatus,
  type DriverDossierStatus,
  type DriverOperationalStatus,
} from '@eveider/domain';

const EVEIDER_FLEET_LABEL = 'Flotte Eveider';

export type DriverListItem = {
  id: string;
  fullName: string;
  email: string;
  organizationKey: string;
  organizationLabel: string;
  team: string | null;
  serviceAreaId: string | null;
  serviceAreaName: string | null;
  status: DriverOperationalStatus;
  statusLabel: string;
  currentDelivery: string | null;
  deliveriesToday: number;
};

/** @deprecated Use DriverListItem */
export type BusinessDriverListItem = DriverListItem;

export type DriverDetail = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  driverCode: string;
  contractorType: 'eveider' | 'business';
  organizationKey: string;
  organizationLabel: string;
  team: string | null;
  serviceAreaId: string | null;
  serviceArea: string | null;
  vehicle: string | null;
  currentLocation: string | null;
  status: DriverOperationalStatus;
  statusLabel: string;
  currentDelivery: string | null;
  deliveriesToday: number;
  invitedAt: string | null;
  dossierStatus: DriverDossierStatus;
  dossierStatusLabel: string;
  idDocumentUrl: string;
  notes: string | null;
  reviewNotes: string | null;
  isBlocked: boolean;
};

/** @deprecated Use DriverDetail */
export type BusinessDriverDetail = DriverDetail;

export type DriverDeliveryItem = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  trackingNumber: string;
  reference: string | null;
  lockerName: string | null;
  businessName: string | null;
  createdAt: string;
  completedAt: string | null;
};

/** @deprecated Use DriverDeliveryItem */
export type BusinessDriverDeliveryItem = DriverDeliveryItem;

function organizationFromRow(row: DriverRosterRecord): {
  organizationKey: string;
  organizationLabel: string;
} {
  if (row.contractorType === 'eveider' || !row.businessId) {
    return { organizationKey: 'eveider', organizationLabel: EVEIDER_FLEET_LABEL };
  }
  return {
    organizationKey: row.businessId,
    organizationLabel: row.organizationName ?? 'Organisation',
  };
}

function formatCurrentDelivery(
  trackingNumber: string | null,
  lockerName: string | null,
): string | null {
  if (!trackingNumber) return null;
  if (lockerName) return `${trackingNumber} → ${lockerName}`;
  return trackingNumber;
}

function driverCode(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function toOperational(row: DriverRosterRecord) {
  const status = deriveDriverOperationalStatus({
    dossierStatus: row.dossierStatus,
    isBlocked: row.isBlocked,
    deactivated: row.deactivated,
    hasActiveDelivery: Boolean(row.currentTrackingNumber),
  });
  return {
    status,
    statusLabel: DRIVER_OPERATIONAL_STATUS_LABELS[status],
    currentDelivery: formatCurrentDelivery(row.currentTrackingNumber, row.currentLockerName),
  };
}

function toListItem(row: DriverRosterRecord): DriverListItem {
  const operational = toOperational(row);
  const organization = organizationFromRow(row);
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    organizationKey: organization.organizationKey,
    organizationLabel: organization.organizationLabel,
    team: null,
    serviceAreaId: row.serviceAreaId,
    serviceAreaName: row.serviceAreaName,
    status: operational.status,
    statusLabel: operational.statusLabel,
    currentDelivery: operational.currentDelivery,
    deliveriesToday: row.deliveriesToday,
  };
}

function toDetail(row: DriverRosterRecord): DriverDetail {
  const operational = toOperational(row);
  const organization = organizationFromRow(row);
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    driverCode: driverCode(row.id),
    contractorType: row.contractorType,
    organizationKey: organization.organizationKey,
    organizationLabel: organization.organizationLabel,
    team: null,
    serviceAreaId: row.serviceAreaId,
    serviceArea: row.serviceAreaName,
    vehicle: null,
    currentLocation: null,
    status: operational.status,
    statusLabel: operational.statusLabel,
    currentDelivery: operational.currentDelivery,
    deliveriesToday: row.deliveriesToday,
    invitedAt: row.invitedAt ? row.invitedAt.toISOString() : null,
    dossierStatus: row.dossierStatus,
    dossierStatusLabel: DRIVER_DOSSIER_STATUS_LABELS[row.dossierStatus],
    idDocumentUrl: row.idDocumentUrl,
    notes: row.notes,
    reviewNotes: row.reviewNotes,
    isBlocked: row.isBlocked,
  };
}

export async function loadBusinessDriverRoster(
  ctx: DataAccessContext,
): Promise<DriverListItem[]> {
  const { courierDossiers } = createRepositories();
  const rows = await courierDossiers.listRosterForBusiness(ctx);
  return rows.map(toListItem);
}

export async function loadAdminDriverRoster(ctx: DataAccessContext): Promise<DriverListItem[]> {
  const { courierDossiers } = createRepositories();
  const rows = await courierDossiers.listRosterForAdmin(ctx);
  return rows.map(toListItem);
}

export const loadBusinessDriverDetail = cache(
  async (businessId: string, driverId: string): Promise<DriverDetail | null> => {
    const { courierDossiers } = createRepositories();
    const row = await courierDossiers.findRosterByBusiness(businessId, driverId);
    return row ? toDetail(row) : null;
  },
);

export const loadAdminDriverDetail = cache(
  async (ctx: DataAccessContext, driverId: string): Promise<DriverDetail | null> => {
    const { courierDossiers } = createRepositories();
    const row = await courierDossiers.findRosterById(ctx, driverId);
    return row ? toDetail(row) : null;
  },
);

export async function loadBusinessDriverDeliveries(
  ctx: DataAccessContext,
  driver: DriverDetail,
): Promise<DriverDeliveryItem[]> {
  if (!driver.userId) return [];
  const { deliveries } = createRepositories();
  const rows = await deliveries.listForBusinessDriver(ctx, driver.userId);
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    statusLabel: DELIVERY_STATUS_LABELS[row.status],
    trackingNumber: row.trackingNumber,
    reference: row.reference,
    lockerName: row.lockerName,
    businessName: null,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  }));
}

export async function loadAdminDriverDeliveries(
  ctx: DataAccessContext,
  driver: DriverDetail,
): Promise<DriverDeliveryItem[]> {
  if (!driver.userId) return [];
  const { deliveries } = createRepositories();
  const rows = await deliveries.listForAdminDriver(ctx, driver.userId);
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    statusLabel: DELIVERY_STATUS_LABELS[row.status],
    trackingNumber: row.trackingNumber,
    reference: row.reference,
    lockerName: row.lockerName,
    businessName: row.businessName,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  }));
}
