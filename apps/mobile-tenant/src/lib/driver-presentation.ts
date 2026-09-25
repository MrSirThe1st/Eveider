import type { DeliveryKind, DeliveryStatus, PackageSize } from '@eveider/domain';
import { PACKAGE_SIZE_LABELS } from '@eveider/domain';

export const DRIVER_ACTIVE_STATUSES: DeliveryStatus[] = [
  'assigned',
  'scanned',
  'drop_off_pending',
];

export const DRIVER_HISTORY_STATUSES: DeliveryStatus[] = ['completed', 'failed'];

export type DriverDeliveryLike = {
  id: string;
  status: DeliveryStatus;
  kind?: DeliveryKind | null;
  completedAt?: string | null;
  createdAt?: string;
  parcel: {
    trackingNumber: string;
    reference?: string | null;
    status?: string;
    recipientName?: string | null;
    businessName: string;
    senderName?: string | null;
    senderPhone?: string | null;
    senderAddress?: string | null;
    senderLocationName?: string | null;
    senderLat?: number | null;
    senderLng?: number | null;
    senderInstructions?: string | null;
    packageSize?: PackageSize | string | null;
    locker: {
      name: string;
      address: string;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    compartmentLabel?: string | null;
  };
};

export type DriverPlace = {
  role: 'Entreprise' | 'Casier';
  action: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
};

export type DriverStepId =
  | 'awaiting_business_pickup'
  | 'en_route_locker'
  | 'locker_deposit'
  | 'awaiting_locker_pickup'
  | 'returning_to_business'
  | 'business_handoff'
  | 'completed'
  | 'failed'
  | 'historical_rts';

export type DriverPrimaryActionId =
  | 'scan_parcel'
  | 'commissioning_arrive_locker'
  | 'commissioning_deposit_proof'
  | 'confirm_business_handoff'
  | null;

export type DriverActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Presentation only — backend remains the source of truth for assignment. */
export function getDriverDeliveryKind(delivery: Pick<DriverDeliveryLike, 'kind'>): DeliveryKind {
  return delivery.kind ?? 'outbound';
}

/** Coarse flow direction (business↔locker), independent of current step. */
export function getDriverDeliveryKindLabel(delivery: Pick<DriverDeliveryLike, 'kind'>): string {
  const kind = getDriverDeliveryKind(delivery);
  if (kind === 'customer_return') return 'Casier → entreprise';
  if (kind === 'return') return 'Retour non retiré (historique)';
  return 'Entreprise → casier';
}

/**
 * Operational movement for the driver's current (or last) stop.
 * Prefer this on queue cards over parcel status labels.
 */
export function getDriverMovementLabel(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): string {
  if (isHistoricalRts(delivery)) return 'Retour non retiré';

  if (isCustomerReturnJob(delivery)) {
    if (delivery.status === 'assigned') return 'Collecte au casier';
    return 'Retour entreprise';
  }

  if (delivery.status === 'assigned') return 'Collecte entreprise';
  return 'Dépôt au casier';
}

export function isHistoricalRts(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'return';
}

export function isCustomerReturnJob(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'customer_return';
}

export function isOutboundAller(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'outbound';
}

export function isActiveDriverDelivery(delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>): boolean {
  return DRIVER_ACTIVE_STATUSES.includes(delivery.status);
}

export function isHistoryDriverDelivery(delivery: Pick<DriverDeliveryLike, 'status'>): boolean {
  return DRIVER_HISTORY_STATUSES.includes(delivery.status);
}

export function canDriverActOnDelivery(delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>): boolean {
  return isActiveDriverDelivery(delivery) && !isHistoricalRts(delivery);
}

/**
 * Driver work exists only as an assigned Eveider Livraison.
 * Flow 2 (merchant_dropoff) and Flow 3B (return_locker) never appear without a delivery.
 */
export function isAssignedEveiderDriverJob(input: {
  deliveryKind?: DeliveryKind | null;
  pickupType?: string | null;
  returnMethod?: string | null;
}): boolean {
  if (!input.deliveryKind) return false;
  return (
    input.deliveryKind === 'outbound' ||
    input.deliveryKind === 'customer_return' ||
    input.deliveryKind === 'return'
  );
}

export function getDriverDeliveryStep(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): { id: DriverStepId; label: string; detail: string } {
  if (isHistoricalRts(delivery)) {
    return {
      id: 'historical_rts',
      label: 'Retour non retiré (historique)',
      detail: 'Lecture seule — aucun nouvel acte chauffeur.',
    };
  }

  if (delivery.status === 'failed') {
    return { id: 'failed', label: 'Incident', detail: 'Cette livraison n’a pas pu être terminée.' };
  }

  if (delivery.status === 'completed') {
    return {
      id: 'completed',
      label: isCustomerReturnJob(delivery) ? 'Retour remis' : 'Dépôt confirmé',
      detail: 'Cette livraison est terminée.',
    };
  }

  if (isCustomerReturnJob(delivery)) {
    if (delivery.status === 'assigned') {
      return {
        id: 'awaiting_locker_pickup',
        label: 'À récupérer au casier',
        detail: 'Identifiez le colis au casier. Le terminal autorise l’ouverture.',
      };
    }
    if (delivery.status === 'scanned') {
      return {
        id: 'returning_to_business',
        label: 'Retour en transport',
        detail: 'Ramenez maintenant le colis à l’entreprise.',
      };
    }
    return {
      id: 'business_handoff',
      label: 'Retourner à l’entreprise',
      detail: 'Remettez le colis à l’entreprise pour terminer la livraison.',
    };
  }

  if (delivery.status === 'assigned') {
    return {
      id: 'awaiting_business_pickup',
      label: 'À récupérer',
      detail: 'Récupérez le colis à l’entreprise.',
    };
  }
  if (delivery.status === 'scanned') {
    return {
      id: 'en_route_locker',
      label: 'En route vers le casier',
      detail: 'Rendez-vous au casier de destination. Le terminal confirmera le dépôt.',
    };
  }
  return {
    id: 'locker_deposit',
    label: 'Preuve de dépôt',
    detail: 'Le terminal confirmera le dépôt une fois le casier en service.',
  };
}

export function getDriverOrigin(delivery: DriverDeliveryLike): DriverPlace {
  const locker = delivery.parcel.locker;
  if (isCustomerReturnJob(delivery) || isHistoricalRts(delivery)) {
    return {
      role: 'Casier',
      action: 'Récupérer',
      name: locker ? `Casier Eveider ${locker.name}` : 'Casier',
      address: locker?.address ?? null,
      latitude: locker?.latitude ?? null,
      longitude: locker?.longitude ?? null,
    };
  }
  return {
    role: 'Entreprise',
    action: 'Collecte',
    name: delivery.parcel.senderLocationName?.trim() || delivery.parcel.businessName,
    address: delivery.parcel.senderAddress ?? null,
    latitude: delivery.parcel.senderLat ?? null,
    longitude: delivery.parcel.senderLng ?? null,
    contactName: delivery.parcel.senderName ?? null,
    contactPhone: delivery.parcel.senderPhone ?? null,
    instructions: delivery.parcel.senderInstructions ?? null,
  };
}

export function getDriverDestination(delivery: DriverDeliveryLike): DriverPlace {
  const locker = delivery.parcel.locker;
  if (isCustomerReturnJob(delivery) || isHistoricalRts(delivery)) {
    return {
      role: 'Entreprise',
      action: 'Retourner à',
      name: delivery.parcel.senderLocationName?.trim() || delivery.parcel.businessName,
      address: delivery.parcel.senderAddress ?? null,
      latitude: delivery.parcel.senderLat ?? null,
      longitude: delivery.parcel.senderLng ?? null,
      contactName: delivery.parcel.senderName ?? null,
      contactPhone: delivery.parcel.senderPhone ?? null,
      instructions: delivery.parcel.senderInstructions ?? null,
    };
  }
  return {
    role: 'Casier',
    action: 'Déposer',
    name: locker ? `Casier Eveider ${locker.name}` : 'Casier',
    address: locker?.address ?? null,
    latitude: locker?.latitude ?? null,
    longitude: locker?.longitude ?? null,
  };
}

export function getDriverCurrentStop(delivery: DriverDeliveryLike): DriverPlace {
  const step = getDriverDeliveryStep(delivery);
  if (
    step.id === 'awaiting_business_pickup' ||
    step.id === 'awaiting_locker_pickup' ||
    step.id === 'historical_rts'
  ) {
    return getDriverOrigin(delivery);
  }
  return getDriverDestination(delivery);
}

export function getDriverPrimaryAction(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): { id: DriverPrimaryActionId; label: string } {
  if (!canDriverActOnDelivery(delivery)) {
    return { id: null, label: '' };
  }
  if (isCustomerReturnJob(delivery)) {
    if (delivery.status === 'assigned') {
      return { id: 'scan_parcel', label: 'Scanner le colis' };
    }
    return { id: 'confirm_business_handoff', label: 'Confirmer la remise' };
  }
  if (delivery.status === 'assigned') {
    return { id: 'scan_parcel', label: 'Scanner le colis' };
  }
  if (delivery.status === 'scanned') {
    return { id: 'commissioning_arrive_locker', label: 'Arrivé au casier' };
  }
  return { id: 'commissioning_deposit_proof', label: 'Photographier le dépôt' };
}

export function getDriverSuccessCopy(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
  action: 'scan' | 'arrive' | 'deposit' | 'handoff',
): { title: string; detail: string } {
  if (action === 'scan' && isCustomerReturnJob(delivery)) {
    return {
      title: 'Retour récupéré',
      detail: 'Ramenez maintenant le colis à l’entreprise.',
    };
  }
  if (action === 'scan') {
    return {
      title: 'Colis récupéré',
      detail: 'Rendez-vous maintenant au casier de destination.',
    };
  }
  if (action === 'handoff') {
    return {
      title: 'Retour remis à l’entreprise',
      detail: 'Cette livraison est terminée.',
    };
  }
  if (action === 'deposit') {
    return {
      title: 'Dépôt confirmé',
      detail: 'Cette livraison est terminée.',
    };
  }
  return {
    title: 'Arrivée enregistrée',
    detail: 'Photographiez le dépôt. Le terminal confirmera le casier une fois en service.',
  };
}

export function getDriverPackageSizeLabel(size?: string | null): string | null {
  if (!size) return null;
  if (size in PACKAGE_SIZE_LABELS) {
    return PACKAGE_SIZE_LABELS[size as PackageSize];
  }
  return size;
}

export function getDriverTrackingLabel(delivery: DriverDeliveryLike): string {
  return delivery.parcel.trackingNumber || delivery.parcel.reference || 'Suivi indisponible';
}

/** Fail closed: keep the previous delivery when the backend/network rejects the action. */
export function applyDriverMutationResult<T extends { delivery: DriverDeliveryLike }>(
  previous: DriverDeliveryLike,
  result: DriverActionResult<T>,
): { delivery: DriverDeliveryLike; error: string | null; succeeded: boolean } {
  if (!result.success) {
    return { delivery: previous, error: translateDriverError(result.error), succeeded: false };
  }
  return { delivery: result.data.delivery, error: null, succeeded: true };
}

export function translateDriverError(message: string): string {
  const value = message.trim();
  if (!value) return 'Action impossible pour le moment. Réessayez.';
  const lower = value.toLowerCase();
  if (lower.includes('non authentifié') || lower.includes('session')) {
    return 'Session expirée. Reconnectez-vous, puis réessayez.';
  }
  if (
    lower.includes('network') ||
    lower.includes('inaccessible') ||
    lower.includes('délai') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch')
  ) {
    return 'Réseau indisponible. L’action n’a pas été enregistrée. Réessayez.';
  }
  if (lower.includes('incorrecte') || lower.includes('suivi')) {
    return 'Numéro de suivi incorrect. Vérifiez le colis, puis réessayez.';
  }
  if (lower.includes('pas en attente de scan') || lower.includes('déjà')) {
    return 'Cette étape est déjà faite. Rechargez la livraison.';
  }
  if (lower.includes('assign')) {
    return 'Cette livraison n’est pas assignée à votre compte.';
  }
  if (lower.includes('casier indisponible') || lower.includes('casier de destination')) {
    return 'Casier indisponible pour cette livraison. Contactez le dispatch.';
  }
  if (lower.includes('autorisée') || lower.includes('non autoris')) {
    return 'Action impossible à cette étape. Rechargez, puis suivez l’étape affichée.';
  }
  if (lower.includes('select') || lower.includes('sql') || lower.includes('null value')) {
    return 'Action impossible pour le moment. Réessayez.';
  }
  return value;
}

export const DRIVER_FORBIDDEN_UI_COPY = [
  'Ouvrir le compartiment',
  'Ouvrir le casier',
  'Choisir un compartiment',
  'Sélectionner un compartiment',
  'Node-RED',
  'PLC',
  'PawaPay',
  'Code de retrait',
  'PIN destinataire',
  'Marquer en transit',
  'Marquer livré',
  'Changer le statut',
  'Passer à l’étape suivante',
] as const;
