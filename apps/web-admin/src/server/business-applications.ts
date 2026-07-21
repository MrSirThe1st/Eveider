import type { BusinessStatus } from '@eveider/domain';
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
  locations: Array<{
    type: string;
    street: string | null;
    city: string | null;
    pickupMethod?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
  }>;
  users: Array<{ fullName: string | null; email: string | null; phone: string | null; userRole: string | null }>;
  documents: Array<{ id: string; type: string; status: string; fileUrl: string; fileName: string | null }>;
  verifications: Array<{
    checks: Array<{ type: string; status: string }>;
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

function toApplicationItem(row: ApplicationRow): BusinessApplicationItem {
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
    })),
    verifications: row.verifications.map((v) => ({
      checks: v.checks.map((c) => ({ type: c.type, status: c.status })),
    })),
  };
}

export async function listBusinessApplications(
  ctx: DataAccessContext,
): Promise<BusinessApplicationItem[]> {
  const { businessOnboarding } = createRepositories();
  const rows = await businessOnboarding.listApplications(ctx);
  return rows.map(toApplicationItem);
}

export async function getBusinessApplicationDetail(
  businessId: string,
): Promise<BusinessApplicationDetail | null> {
  const { businessOnboarding } = createRepositories();
  const summary = await businessOnboarding.getOnboardingSummary(businessId);
  if (!summary) return null;

  return {
    ...toApplicationItem(summary as ApplicationRow),
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
