import type { ParcelStatus } from './parcel.js';
import type {
  AdminAccountStatus,
  BusinessIndustry,
  BusinessStatus,
  OrganizationVerificationStatus,
} from './business.js';
import type { CompartmentStatus, LockerStatus, LockerType } from './locker.js';
import type { DeliveryKind, DeliveryStatus } from './delivery.js';
import type { IssueStatus, IssueType } from './issue.js';
import type { ParcelReturnMethod, ParcelReturnStatus } from './parcel-return.js';
import type { ParcelEventActorType, ParcelEventType } from './parcel-event.js';
import type { ChargePayer } from './commercial.js';
import type { ParcelChargeKind } from './pricing.js';
import type { BusinessParcelLocation, BusinessParcelProgressionStep } from './parcel-location.js';
import type { CityStatus } from './cities.js';
import type { ServiceAreaStatus } from './service-area.js';

/** French UI labels — ALL CAPS per design DNA. */
export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  created: 'CRÉÉ',
  in_transit: 'EN TRANSIT',
  delivered_to_locker: 'AU CASIER',
  ready_for_pickup: 'PRÊT AU RETRAIT',
  collected: 'RETIRÉ',
  return_at_point: 'RETOUR AU CASIER',
  returning: 'RETOUR EN COURS',
  returned: 'RETOURNÉ',
};

/** Business Colis location — derived, not a stored parcel status. */
export const BUSINESS_PARCEL_LOCATION_LABELS: Record<BusinessParcelLocation, string> = {
  awaiting_courier: 'EN ATTENTE DE PRISE EN CHARGE',
  awaiting_dropoff: 'EN ATTENTE DE DÉPÔT',
  courier_assigned: 'CHAUFFEUR ASSIGNÉ',
  in_transit: 'EN TRANSIT',
  at_locker: 'AU CASIER',
  ready_for_pickup: 'PRÊT AU RETRAIT',
  return_in_progress: 'RETOUR EN COURS',
  returned_to_business: 'RETOURNÉ',
  collected: 'RETIRÉ',
  customer_return_requested: 'RETOUR DEMANDÉ',
  customer_return_authorized: 'RETOUR AUTORISÉ',
  customer_return_at_locker: 'RETOUR AU CASIER',
  customer_return_in_transit: 'RETOUR EN COURS',
  customer_return_completed: 'RETOURNÉ À L’ENTREPRISE',
};

export const BUSINESS_PARCEL_PROGRESSION_LABELS: Record<BusinessParcelProgressionStep, string> = {
  submitted: 'SOUMIS',
  ...BUSINESS_PARCEL_LOCATION_LABELS,
};

export const PARCEL_RETURN_STATUS_LABELS: Record<ParcelReturnStatus, string> = {
  requested: 'DEMANDÉ',
  authorized: 'AUTORISÉ',
  awaiting_pickup: 'EN ATTENTE DE COLLECTE',
  in_transit: 'EN TRANSIT',
  completed: 'TERMINÉ',
  rejected: 'REFUSÉ',
  cancelled: 'ANNULÉ',
};

export const PARCEL_RETURN_METHOD_LABELS: Record<ParcelReturnMethod, string> = {
  eveider_return: 'RETOUR EVEIDER',
  business_pickup: 'RETRAIT PAR L’ENTREPRISE',
};

export const LOCKER_TYPE_LABELS: Record<LockerType, string> = {
  SMART_LOCKER: 'CASIER EVEIDER',
  PARTNER_POINT: 'POINT PARTENAIRE (HISTORIQUE)',
  RESIDENTIAL_LOCKER: 'POINT RÉSIDENTIEL (HISTORIQUE)',
};

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  draft: 'BROUILLON',
  onboarding: 'EN COURS',
  pending_review: 'À VÉRIFIER',
  pending_correction: 'CORRECTION REQUISE',
  pending: 'EN ATTENTE',
  active: 'ACTIF',
  suspended: 'SUSPENDU',
  blocked: 'BLOQUÉ',
};

/** Sentence-case French labels for industry pickers (signup / onboarding). */
export const BUSINESS_INDUSTRY_LABELS: Record<BusinessIndustry, string> = {
  Fashion: 'Mode',
  Electronics: 'Électronique',
  Beauty: 'Beauté',
  Food: 'Alimentaire',
  Pharmacy: 'Pharmacie',
  Retail: 'Commerce de détail',
  Documents: 'Documents',
  Logistics: 'Logistique',
  'E-commerce': 'E-commerce',
  Health: 'Santé',
  Education: 'Éducation',
  Hospitality: 'Hôtellerie & restauration',
  Automotive: 'Automobile',
  Construction: 'Construction',
  Finance: 'Finance & assurance',
  Agriculture: 'Agriculture',
  Telecommunications: 'Télécommunications',
  Manufacturing: 'Industrie & fabrication',
  Services: 'Services',
  Other: 'Autre',
};

export const ADMIN_ACCOUNT_STATUS_LABELS: Record<AdminAccountStatus, string> = {
  active: 'ACTIF',
  suspended: 'SUSPENDU',
};

export const ORGANIZATION_VERIFICATION_LABELS: Record<OrganizationVerificationStatus, string> = {
  not_started: 'NON VÉRIFIÉ',
  pending: 'EN ATTENTE',
  approved: 'VÉRIFIÉ',
  rejected: 'REFUSÉ',
  correction_requested: 'CORRECTION REQUISE',
};

export const LOCKER_STATUS_LABELS: Record<LockerStatus, string> = {
  active: 'Actif',
  offline: 'Inactif',
  full: 'Complet',
  archived: 'Archivé',
};

export const COMPARTMENT_STATUS_LABELS: Record<CompartmentStatus, string> = {
  available: 'Disponible',
  occupied: 'Occupé',
  reserved: 'Réservé',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'À ACCEPTER',
  accepted: 'ACCEPTÉE',
  started: 'COMMENCÉE',
  scanned: 'PRISE EN CHARGE',
  drop_off_pending: 'DÉPÔT EN ATTENTE',
  completed: 'TERMINÉ',
  failed: 'ÉCHOUÉ',
};

export const DELIVERY_KIND_LABELS: Record<DeliveryKind, string> = {
  outbound: 'ALLER',
  return: 'RETOUR RTS',
  customer_return: 'RETOUR CLIENT',
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

export const PARCEL_EVENT_TYPE_LABELS: Record<ParcelEventType, string> = {
  'parcel.created': 'COLIS CRÉÉ',
  'parcel.status_changed': 'STATUT COLIS MODIFIÉ',
  'delivery.assigned': 'LIVRAISON ASSIGNÉE',
  'delivery.accepted': 'LIVRAISON ACCEPTÉE',
  'delivery.started': 'LIVRAISON COMMENCÉE',
  'delivery.claimed': 'LIVRAISON PRISE',
  'delivery.scanned': 'PRISE EN CHARGE',
  'delivery.drop_off_pending': 'DÉPÔT EN ATTENTE',
  'delivery.completed': 'DÉPÔT TERMINÉ',
  'delivery.failed': 'LIVRAISON ÉCHOUÉE',
  'compartment.reserved': 'COMPARTIMENT RÉSERVÉ',
  'compartment.occupied': 'COMPARTIMENT OCCUPÉ',
  'compartment.released': 'COMPARTIMENT LIBÉRÉ',
  'pickup_pin.issued': 'CODE DE RETRAIT ÉMIS',
  'notification.sent': 'NOTIFICATION ENVOYÉE',
  'notification.failed': 'NOTIFICATION ÉCHOUÉE',
  'issue.opened': 'INCIDENT OUVERT',
  'parcel_return.requested': 'RETOUR DEMANDÉ',
  'parcel_return.authorized': 'RETOUR AUTORISÉ',
  'parcel_return.rejected': 'RETOUR REFUSÉ',
  'parcel_return.cancelled': 'RETOUR ANNULÉ',
  'parcel_return.deposited': 'RETOUR DÉPOSÉ',
  'parcel_return.completed': 'RETOUR TERMINÉ',
};

export const PARCEL_EVENT_ACTOR_TYPE_LABELS: Record<ParcelEventActorType, string> = {
  user: 'UTILISATEUR',
  system: 'SYSTÈME',
  api_key: 'CLÉ API',
};

export const SERVICE_AREA_STATUS_LABELS: Record<ServiceAreaStatus, string> = {
  active: 'ACTIVE',
  archived: 'ARCHIVÉE',
};

export const CITY_STATUS_LABELS: Record<CityStatus, string> = SERVICE_AREA_STATUS_LABELS;

export const PARCEL_CHARGE_KIND_LABELS: Record<ParcelChargeKind, string> = {
  delivery_fee: 'Livraison Eveider',
  drop_off_fee: 'Dépôt marchand',
  locker_rental: 'Stockage',
  outbound_delivery: 'Livraison Eveider',
  locker_collection: 'Retrait au casier',
  return_delivery: 'Retour Eveider',
  return_locker: 'Retrait du retour par l’entreprise',
};

export const CHARGE_PAYER_LABELS: Record<ChargePayer, string> = {
  recipient: 'Destinataire',
  business: 'Entreprise',
};
