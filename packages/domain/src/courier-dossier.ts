export type CourierContractorKind = 'eveider' | 'business';

export type CourierDossierStatus =
  | 'pending_review'
  | 'needs_correction'
  | 'rejected'
  | 'approved'
  | 'invited'
  | 'active'
  | 'deactivated';

export const COURIER_DOSSIER_STATUSES: readonly CourierDossierStatus[] = [
  'pending_review',
  'needs_correction',
  'rejected',
  'approved',
  'invited',
  'active',
  'deactivated',
] as const;

const TRANSITIONS: Record<CourierDossierStatus, readonly CourierDossierStatus[]> = {
  pending_review: ['approved', 'needs_correction', 'rejected'],
  needs_correction: ['pending_review'],
  rejected: [],
  approved: ['invited'],
  invited: ['active', 'deactivated'],
  active: ['deactivated'],
  deactivated: ['active'],
};

export function canTransitionCourierDossier(
  from: CourierDossierStatus,
  to: CourierDossierStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertCourierDossierTransition(
  from: CourierDossierStatus,
  to: CourierDossierStatus,
): void {
  if (!canTransitionCourierDossier(from, to)) {
    throw new Error(`Transition de dossier coursier invalide : ${from} → ${to}`);
  }
}

export function isAssignableCourierDossier(status: CourierDossierStatus): boolean {
  return status === 'active';
}

export const COURIER_DOSSIER_STATUS_LABELS: Record<CourierDossierStatus, string> = {
  pending_review: 'En revue',
  needs_correction: 'Correction demandée',
  rejected: 'Rejeté',
  approved: 'Approuvé',
  invited: 'Invité',
  active: 'Actif',
  deactivated: 'Désactivé',
};
