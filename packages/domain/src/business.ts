export type BusinessStatus =
  | 'draft'
  | 'onboarding'
  | 'pending_review'
  | 'pending_correction'
  | 'pending'
  | 'active'
  | 'suspended'
  | 'blocked';

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

const BUSINESS_TRANSITIONS: Record<BusinessStatus, readonly BusinessStatus[]> = {
  draft: ['onboarding', 'blocked'],
  onboarding: ['pending_review', 'blocked'],
  pending_review: ['active', 'pending_correction', 'blocked'],
  pending_correction: ['pending_review', 'blocked'],
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

export function canSubmitParcelsAsBusiness(status: BusinessStatus): boolean {
  return status === 'active';
}

export function canEditOnboardingWizard(status: BusinessStatus): boolean {
  return status === 'draft' || status === 'onboarding' || status === 'pending_correction';
}

export function isUnderAdminReview(status: BusinessStatus): boolean {
  return status === 'pending_review' || status === 'pending';
}

