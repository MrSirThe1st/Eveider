export type BusinessStatus = 'pending' | 'active' | 'suspended' | 'blocked';

export const BUSINESS_STATUSES: readonly BusinessStatus[] = [
  'pending',
  'active',
  'suspended',
  'blocked',
] as const;

const BUSINESS_TRANSITIONS: Record<BusinessStatus, readonly BusinessStatus[]> = {
  pending: ['active', 'blocked'],
  active: ['suspended', 'blocked'],
  suspended: ['active', 'blocked'],
  blocked: ['active'],
};

export function canTransitionBusiness(from: BusinessStatus, to: BusinessStatus): boolean {
  return BUSINESS_TRANSITIONS[from].includes(to);
}

export function transitionBusiness(from: BusinessStatus, to: BusinessStatus): BusinessStatus {
  if (!canTransitionBusiness(from, to)) {
    throw new Error(`Invalid business transition: ${from} → ${to}`);
  }
  return to;
}

export function canSubmitParcelsAsBusiness(status: BusinessStatus): boolean {
  return status === 'active';
}
