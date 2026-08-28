export type BusinessStatus =
  | 'draft'
  | 'onboarding'
  | 'pending_review'
  | 'pending_correction'
  | 'pending'
  | 'active'
  | 'suspended'
  | 'blocked';

/** Operational account status. KYC lives on `business_verifications`, not here. */
export const OPERATIONAL_BUSINESS_STATUSES = ['active', 'suspended', 'blocked'] as const satisfies readonly BusinessStatus[];

export const BUSINESS_STATUSES: readonly BusinessStatus[] = [
  'draft',
  'onboarding',
  'pending_review',
  'pending_correction',
  'pending',
  'active',
  'suspended',
  'blocked',
] as const;

export const BUSINESS_INDUSTRY_OPTIONS = [
  'Fashion',
  'Electronics',
  'Beauty',
  'Food',
  'Pharmacy',
  'Retail',
  'Documents',
  'Other',
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRY_OPTIONS)[number];

export type OrganizationVerificationStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'correction_requested';

const KYC_OPERATIONAL_LEFTOVERS: readonly BusinessStatus[] = [
  'draft',
  'onboarding',
  'pending_review',
  'pending_correction',
  'pending',
];

const BUSINESS_TRANSITIONS: Record<BusinessStatus, readonly BusinessStatus[]> = {
  draft: ['onboarding', 'active', 'blocked'],
  onboarding: ['pending_review', 'active', 'blocked'],
  pending_review: ['active', 'pending_correction', 'blocked'],
  pending_correction: ['pending_review', 'active', 'blocked'],
  pending: ['active', 'pending_correction', 'blocked'],
  active: ['suspended', 'blocked'],
  suspended: ['active', 'blocked'],
  blocked: ['active'],
};

export function canTransitionBusiness(from: BusinessStatus, to: BusinessStatus): boolean {
  return BUSINESS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionBusiness(from: BusinessStatus, to: BusinessStatus): BusinessStatus {
  if (!canTransitionBusiness(from, to)) {
    throw new Error(`Transition d'état entreprise invalide: ${from} → ${to}`);
  }
  return to;
}

/** Platform access and parcel creation follow operational status, not KYC. */
export function canSubmitParcelsAsBusiness(status: BusinessStatus): boolean {
  return status === 'active';
}

export function isKycOperationalLeftover(status: BusinessStatus): boolean {
  return KYC_OPERATIONAL_LEFTOVERS.includes(status);
}

/** KYC approval must not change suspended/blocked accounts; leftover KYC statuses become active. */
export function operationalStatusAfterVerificationApproval(status: BusinessStatus): BusinessStatus {
  if (isKycOperationalLeftover(status)) return 'active';
  return status;
}

export function deriveOrganizationVerificationStatus(
  latest: Exclude<OrganizationVerificationStatus, 'not_started'> | null | undefined,
): OrganizationVerificationStatus {
  return latest ?? 'not_started';
}

export function canEditOrganizationVerification(status: OrganizationVerificationStatus): boolean {
  return status === 'not_started' || status === 'correction_requested' || status === 'rejected';
}

export function isOrganizationVerificationPending(status: OrganizationVerificationStatus): boolean {
  return status === 'pending';
}

export function isOrganizationVerified(status: OrganizationVerificationStatus): boolean {
  return status === 'approved';
}

