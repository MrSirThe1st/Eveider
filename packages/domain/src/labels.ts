import type { BusinessStatus } from './business.js';
import type { CompartmentStatus, LockerStatus, LockerType } from './locker.js';
import type { DeliveryStatus } from './delivery.js';
import type { IssueStatus, IssueType } from './issue.js';
import type { ParcelStatus } from './parcel.js';
import type { BusinessParcelLocation, BusinessParcelProgressionStep } from './parcel-location.js';

/** French UI labels — ALL CAPS per design DNA. */
export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  created: 'CRÉÉ',
  in_transit: 'EN TRANSIT',
  delivered_to_locker: 'LIVRÉ AU POINT',
  ready_for_pickup: 'PRÊT POUR RETRAIT',
  collected: 'RETIRÉ',
};

/** Business Colis location — derived, not a stored parcel status. */
export const BUSINESS_PARCEL_LOCATION_LABELS: Record<BusinessParcelLocation, string> = {
  awaiting_courier: 'EN ATTENTE DU COURSIER',
  awaiting_dropoff: 'EN ATTENTE DE DÉPÔT',
  courier_assigned: 'COURSIER ASSIGNÉ',
  in_transit: 'EN TRANSIT',
  at_locker: 'ARRIVÉ AU POINT',
  ready_for_pickup: 'PRÊT POUR RETRAIT',
  collected: 'RETIRÉ',
};

export const BUSINESS_PARCEL_PROGRESSION_LABELS: Record<BusinessParcelProgressionStep, string> = {
  submitted: 'SOUMIS',
  ...BUSINESS_PARCEL_LOCATION_LABELS,
};

export const LOCKER_TYPE_LABELS: Record<LockerType, string> = {
  SMART_LOCKER: 'CASIER INTELLIGENT',
  PARTNER_POINT: 'POINT PARTENAIRE',
  RESIDENTIAL_LOCKER: 'POINT RÉSIDENTIEL',
};

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  draft: 'BROUILLON',
  onboarding: 'CONFIGURATION EN COURS',
  pending_review: 'EN ATTENTE DE VÉRIFICATION',
  pending_correction: 'CORRECTION REQUISE',
  pending: 'EN ATTENTE',
  active: 'ACTIF',
  suspended: 'SUSPENDU',
  blocked: 'BLOQUÉ',
};

export const LOCKER_STATUS_LABELS: Record<LockerStatus, string> = {
  active: 'ACTIF',
  offline: 'INACTIF',
  full: 'COMPLET',
  archived: 'ARCHIVÉ',
};

export const COMPARTMENT_STATUS_LABELS: Record<CompartmentStatus, string> = {
  available: 'DISPONIBLE',
  occupied: 'OCCUPÉ',
  reserved: 'RÉSERVÉ',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'ASSIGNÉ',
  scanned: 'SCANNÉ',
  drop_off_pending: 'DÉPÔT EN ATTENTE',
  completed: 'TERMINÉ',
  failed: 'ÉCHOUÉ',
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  failed_delivery: 'LIVRAISON ÉCHOUÉE',
  locker_unavailable: 'CASIER INDISPONIBLE',
  parcel_problem: 'PROBLÈME COLIS',
  locker_system: 'SYSTÈME CASIER',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'OUVERT',
  in_progress: 'EN COURS',
  resolved: 'RÉSOLU',
};
