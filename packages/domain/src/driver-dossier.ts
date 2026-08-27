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

export function isAssignableDriverDossier(status: DriverDossierStatus): boolean {
  return status === 'active';
}

export const DRIVER_DOSSIER_STATUS_LABELS: Record<DriverDossierStatus, string> = {
  pending_review: 'En revue',
  needs_correction: 'Correction demandée',
  rejected: 'Rejeté',
  approved: 'Approuvé',
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
