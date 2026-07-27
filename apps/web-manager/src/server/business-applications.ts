import type { BusinessStatus } from '@eveider/domain';
import { canSubmitParcelsAsBusiness } from '@eveider/domain';
import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';

export type BusinessApplicationItem = {
  id: string;
  name: string;
  status: BusinessStatus;
  riskClassification: string | null;
  businessType: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isPhoneVerified: boolean;
  updatedAt: string;
  createdAt: string;
  locations: Array<{
    type: string;
    street: string | null;
    city: string | null;
    pickupMethod?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
  }>;
  users: Array<{ fullName: string | null; email: string | null; phone: string | null; userRole: string | null }>;
  documents: Array<{
    id: string;
    type: string;
    status: string;
    fileUrl: string;
    fileName: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  verifications: Array<{
    status: string;
    reviewNotes: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    checks: Array<{ type: string; status: string; notes: string | null }>;
  }>;
  statusHistory: Array<{
    id: string;
    previousStatus: string;
    newStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
};

/** Full KYC dossier — same shape as review screen. */
export type BusinessApplicationDetail = BusinessApplicationItem & {
  industry: string | null;
  salesChannels: string[];
  description: string | null;
  legalCompanyName: string | null;
  rccmNumber: string | null;
  nifNumber: string | null;
  legalRepName: string | null;
  individualFullName: string | null;
};

type ApplicationRow = Awaited<
  ReturnType<ReturnType<typeof createRepositories>['businessOnboarding']['listApplications']>
>[number];

type SummaryRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createRepositories>['businessOnboarding']['getOnboardingSummary']>>
>;

function toApplicationItem(row: ApplicationRow | SummaryRow): BusinessApplicationItem {
  const statusHistory =
    'statusHistory' in row && Array.isArray(row.statusHistory)
      ? row.statusHistory.map((h) => ({
          id: h.id,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          reason: h.reason,
          createdAt: h.createdAt.toISOString(),
        }))
      : [];

  return {
    id: row.id,
    name: row.name,
    status: row.status as BusinessStatus,
    riskClassification: row.riskClassification,
    businessType: row.businessType,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    isPhoneVerified: row.isPhoneVerified,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    locations: row.locations.map((l) => ({
      type: l.type,
      street: l.street,
      city: l.city,
      pickupMethod: l.pickupMethod,
      contactPerson: l.contactPerson,
      contactPhone: l.contactPhone,
    })),
    users: row.users.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      userRole: u.userRole,
    })),
    documents: row.documents.map((d) => ({
      id: d.id,
      type: d.type,
      status: d.status,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
    })),
    verifications: row.verifications.map((v) => ({
      status: v.status,
      reviewNotes: v.reviewNotes,
      submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      checks: v.checks.map((c) => ({ type: c.type, status: c.status, notes: c.notes })),
    })),
    statusHistory,
  };
}

export async function listBusinessApplications(
  ctx: DataAccessContext,
): Promise<BusinessApplicationItem[]> {
  const { businessOnboarding } = createRepositories();
  const rows = await businessOnboarding.listApplications(ctx);
  return rows
    .map(toApplicationItem)
    .filter((application) => !canSubmitParcelsAsBusiness(application.status));
}

export async function getBusinessApplicationDetail(
  businessId: string,
): Promise<BusinessApplicationDetail | null> {
  const { businessOnboarding } = createRepositories();
  const summary = await businessOnboarding.getOnboardingSummary(businessId);
  if (!summary) return null;

  return {
    ...toApplicationItem(summary),
    industry: summary.industry,
    salesChannels: summary.salesChannels ?? [],
    description: summary.description,
    legalCompanyName: summary.legalCompanyName,
    rccmNumber: summary.rccmNumber,
    nifNumber: summary.nifNumber,
    legalRepName: summary.legalRepName,
    individualFullName: summary.individualFullName,
  };
}

/** Next pending dossier in the queue (after current), for ops continuity. */
export async function getNextBusinessApplicationId(
  ctx: DataAccessContext,
  currentBusinessId: string,
): Promise<string | null> {
  const applications = await listBusinessApplications(ctx);
  const index = applications.findIndex((app) => app.id === currentBusinessId);
  if (index < 0) {
    return applications[0]?.id ?? null;
  }
  return applications[index + 1]?.id ?? applications[0]?.id ?? null;
}
