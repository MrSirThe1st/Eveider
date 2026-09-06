export type DriverContractorKind = 'eveider' | 'organization';

export type DriverDossierStatus =
  | 'pending_review'
  | 'needs_correction'
  | 'rejected'
  | 'approved'
  | 'invited'
  | 'active'
  | 'deactivated';

export const DRIVER_DOSSIER_STATUSES: readonly DriverDossierStatus[] = [
  'pending_review',
  'needs_correction',
  'rejected',
  'approved',
  'invited',
  'active',
  'deactivated',
] as const;

const TRANSITIONS: Record<DriverDossierStatus, readonly DriverDossierStatus[]> = {
  pending_review: ['approved', 'needs_correction', 'rejected'],
  needs_correction: ['pending_review'],
  rejected: [],
  approved: ['invited'],
  invited: ['active', 'deactivated'],
  active: ['deactivated'],
  deactivated: ['active'],
};

export function canTransitionDriverDossier(
  from: DriverDossierStatus,
  to: DriverDossierStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertDriverDossierTransition(
  from: DriverDossierStatus,
  to: DriverDossierStatus,
): void {
  if (!canTransitionDriverDossier(from, to)) {
    throw new Error(`Transition de dossier chauffeur invalide : ${from} → ${to}`);
  }
}

/**
 * Eveider fleet drivers need platform approval before assignment.
 * Business drivers are operational as soon as invited/active (or still on file
 * in review) — documents stay recorded for Eveider without blocking delivery.
 */
export function isAssignableDriverDossier(
  status: DriverDossierStatus,
  contractorType: DriverContractorKind | 'business' = 'eveider',
): boolean {
  if (status === 'rejected' || status === 'deactivated') return false;
  if (contractorType === 'business' || contractorType === 'organization') {
    return (
      status === 'pending_review' ||
      status === 'needs_correction' ||
      status === 'approved' ||
      status === 'invited' ||
      status === 'active'
    );
  }
  return status === 'approved' || status === 'invited' || status === 'active';
}

export type DriverOperationalStatus =
  | 'pending_approval'
  | 'available'
  | 'on_delivery'
  | 'suspended'
  | 'rejected';

export const DRIVER_OPERATIONAL_STATUSES: readonly DriverOperationalStatus[] = [
  'pending_approval',
  'available',
  'on_delivery',
  'suspended',
  'rejected',
] as const;

export const DRIVER_OPERATIONAL_STATUS_LABELS: Record<DriverOperationalStatus, string> = {
  pending_approval: 'PIÈCES À CONTRÔLER',
  available: 'DISPONIBLE',
  on_delivery: 'EN LIVRAISON',
  suspended: 'SUSPENDU',
  rejected: 'REJETÉ',
};

export type DriverOperationalStatusInput = {
  dossierStatus: DriverDossierStatus;
  contractorType?: DriverContractorKind | 'business';
  isBlocked?: boolean;
  deactivated?: boolean;
  hasActiveDelivery: boolean;
};

export function deriveDriverOperationalStatus(
  input: DriverOperationalStatusInput,
): DriverOperationalStatus {
  if (input.isBlocked || input.deactivated || input.dossierStatus === 'deactivated') {
    return 'suspended';
  }
  if (input.dossierStatus === 'rejected') {
    return 'rejected';
  }
  const isBusinessDriver =
    input.contractorType === 'business' || input.contractorType === 'organization';
  if (
    !isBusinessDriver &&
    (input.dossierStatus === 'pending_review' || input.dossierStatus === 'needs_correction')
  ) {
    return 'pending_approval';
  }
  if (input.hasActiveDelivery) {
    return 'on_delivery';
  }
  return 'available';
}

export const DRIVER_DOSSIER_STATUS_LABELS: Record<DriverDossierStatus, string> = {
  pending_review: 'Pièces à contrôler',
  needs_correction: 'À corriger',
  rejected: 'Refusé',
  approved: 'Validé',
  invited: 'Invité',
  active: 'Actif',
  deactivated: 'Désactivé',
};

export type CourierContractorKind = 'eveider' | 'business' | 'organization';
export type CourierDossierStatus = DriverDossierStatus;
export const canTransitionCourierDossier = canTransitionDriverDossier;
export const assertCourierDossierTransition = assertDriverDossierTransition;
export const isAssignableCourierDossier = isAssignableDriverDossier;
export const COURIER_DOSSIER_STATUS_LABELS = DRIVER_DOSSIER_STATUS_LABELS;
export const COURIER_DOSSIER_STATUSES = DRIVER_DOSSIER_STATUSES;
