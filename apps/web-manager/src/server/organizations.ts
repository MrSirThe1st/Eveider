import { cache } from 'react';
import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import {
  ADMIN_ACCOUNT_STATUS_LABELS,
  deriveOrganizationVerificationStatus,
  normalizeAdminAccountStatus,
  ORGANIZATION_VERIFICATION_LABELS,
  type AdminAccountStatus,
  type BusinessStatus,
  type OrganizationVerificationStatus,
  type OrganizationRole,
} from '@eveider/domain';
import type { DeliveryStatus } from '@eveider/domain';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { toBusinessDto } from '@/lib/business-presenter';
import { loadAdminDriverRoster, type DriverListItem } from '@/server/drivers';
import {
  getBusinessApplicationDetail,
  getNextBusinessApplicationId,
  listBusinessApplications,
  type BusinessApplicationDetail,
  type BusinessApplicationItem,
} from '@/server/business-applications';

export type AdminOrganizationListItem = {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  accountStatus: AdminAccountStatus;
  accountStatusLabel: string;
  verificationStatus: OrganizationVerificationStatus;
  verificationStatusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrganizationSummary = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  accessCode: string | null;
  industry: string | null;
  businessType: string | null;
  accountStatus: AdminAccountStatus;
  accountStatusLabel: string;
  verificationStatus: OrganizationVerificationStatus;
  verificationStatusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrganizationMember = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: OrganizationRole;
};

export type OrganizationOperatingAccessDto = {
  enabledFeatures: Array<
    'CREATE_SHIPMENT' | 'API_ACCESS' | 'COD' | 'MONTHLY_INVOICE'
  >;
  dailyShipments: number;
  monthlyShipments: number;
  maxPackageValueUsd: number;
  codDailyLimitUsd: number;
};

export type AdminOrganizationDeliveryItem = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: DeliveryStatus;
  statusLabel: string;
  driverName: string | null;
  createdAt: string;
  completedAt: string | null;
};

function toVerificationStatus(raw: string | null | undefined): OrganizationVerificationStatus {
  return deriveOrganizationVerificationStatus(
    raw === 'not_started' || raw == null
      ? undefined
      : (raw as Exclude<OrganizationVerificationStatus, 'not_started'>),
  );
}

function toListItem(row: {
  business: { id: string; name: string; status: BusinessStatus; createdAt: Date; updatedAt: Date };
  verificationStatus: string;
  ownerName: string | null;
  ownerEmail: string | null;
}): AdminOrganizationListItem {
  const accountStatus = normalizeAdminAccountStatus(row.business.status);
  const verificationStatus = toVerificationStatus(row.verificationStatus);
  return {
    id: row.business.id,
    name: row.business.name,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    accountStatus,
    accountStatusLabel: ADMIN_ACCOUNT_STATUS_LABELS[accountStatus],
    verificationStatus,
    verificationStatusLabel: ORGANIZATION_VERIFICATION_LABELS[verificationStatus],
    createdAt: row.business.createdAt.toISOString(),
    updatedAt: row.business.updatedAt.toISOString(),
  };
}

export async function listAdminOrganizations(
  ctx: DataAccessContext,
  options?: {
    search?: string;
    accountStatus?: AdminAccountStatus | 'all';
    verificationStatus?: OrganizationVerificationStatus | 'all';
  },
): Promise<AdminOrganizationListItem[]> {
  const { businessOnboarding } = createRepositories();
  const rows = await businessOnboarding.listOrganizationsForAdmin(ctx, {
    search: options?.search,
    accountStatus: options?.accountStatus === 'all' ? 'all' : options?.accountStatus,
    verificationStatus:
      options?.verificationStatus === 'all' ? 'all' : options?.verificationStatus,
  });
  return rows.map(toListItem);
}

export const loadAdminOrganizationSummary = cache(
  async (ctx: DataAccessContext, organizationId: string): Promise<AdminOrganizationSummary | null> => {
    const { businesses, businessOnboarding } = createRepositories();
    const business = await businesses.findById(ctx, organizationId);
    if (!business || business.isPlatformOrg) return null;

    const latest = await businessOnboarding.getLatestVerification(organizationId);
    const accountStatus = normalizeAdminAccountStatus(business.status);
    const verificationStatus = toVerificationStatus(latest?.status ?? null);

    return {
      id: business.id,
      name: business.name,
      contactEmail: business.contactEmail,
      contactPhone: business.contactPhone,
      accessCode: business.accessCode,
      industry: business.industry,
      businessType: business.businessType,
      accountStatus,
      accountStatusLabel: ADMIN_ACCOUNT_STATUS_LABELS[accountStatus],
      verificationStatus,
      verificationStatusLabel: ORGANIZATION_VERIFICATION_LABELS[verificationStatus],
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  },
);

export const loadAdminOrganizationOperatingAccess = cache(
  async (
    ctx: DataAccessContext,
    organizationId: string,
  ): Promise<OrganizationOperatingAccessDto | null> => {
    const { businesses } = createRepositories();
    const summary = await loadAdminOrganizationSummary(ctx, organizationId);
    if (!summary) return null;
    const access = await businesses.getOperatingAccess(ctx, organizationId);
    return {
      enabledFeatures: [...access.enabledFeatures],
      dailyShipments: access.dailyShipments,
      monthlyShipments: access.monthlyShipments,
      maxPackageValueUsd: access.maxPackageValueUsd,
      codDailyLimitUsd: access.codDailyLimitUsd,
    };
  },
);

export async function loadAdminOrganizationMembers(
  ctx: DataAccessContext,
  organizationId: string,
): Promise<AdminOrganizationMember[]> {
  const { memberships } = createRepositories();
  const rows = await memberships.listMembersForOrganization(ctx, organizationId);
  return rows.map((row) => ({
    id: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    phone: row.user.phone,
    role: row.role,
  }));
}

export async function loadAdminOrganizationDrivers(
  ctx: DataAccessContext,
  organizationId: string,
): Promise<DriverListItem[]> {
  const roster = await loadAdminDriverRoster(ctx);
  return roster.filter((driver) => driver.organizationKey === organizationId);
}

export async function loadAdminOrganizationDeliveries(
  ctx: DataAccessContext,
  organizationId: string,
): Promise<AdminOrganizationDeliveryItem[]> {
  const { deliveries } = createRepositories();
  const rows = await deliveries.listForAdmin(ctx, {
    businessId: organizationId,
    includeAllStatuses: true,
  });
  return rows.slice(0, 100).map((row) => ({
    id: row.id,
    trackingNumber: row.parcel.trackingNumber,
    reference: row.parcel.reference,
    status: row.status as DeliveryStatus,
    statusLabel: DELIVERY_STATUS_LABELS[row.status as DeliveryStatus] ?? row.status,
    driverName: row.courier.fullName,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  }));
}

export {
  listBusinessApplications as listAdminOrganizationVerificationQueue,
  getBusinessApplicationDetail as getAdminOrganizationVerificationDetail,
  getNextBusinessApplicationId,
  type BusinessApplicationItem,
  type BusinessApplicationDetail,
};
