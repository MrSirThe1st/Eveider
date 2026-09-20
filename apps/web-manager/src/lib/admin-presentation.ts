import type {
  DeliveryKind,
  DeliveryStatus,
  ParcelReturnMethod,
  ParcelReturnStatus,
  ParcelStatus,
  ShipmentPickupType,
} from '@eveider/domain';

export type AdminParcelAttentionFilter =
  | 'all'
  | 'awaiting_assignment'
  | 'in_transit'
  | 'at_locker'
  | 'ready_for_pickup'
  | 'return_at_locker'
  | 'returned';

export const ADMIN_PARCEL_ATTENTION_FILTERS: {
  value: AdminParcelAttentionFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Tous' },
  { value: 'awaiting_assignment', label: 'À assigner' },
  { value: 'in_transit', label: 'En transport' },
  { value: 'at_locker', label: 'Au casier' },
  { value: 'ready_for_pickup', label: 'Prêts au retrait' },
  { value: 'return_at_locker', label: 'Retours au casier' },
  { value: 'returned', label: 'Retournés' },
];

export function getFulfillmentMethodLabel(pickupType: ShipmentPickupType): string {
  return pickupType === 'merchant_dropoff' ? 'Dépôt au casier' : 'Collecte Eveider';
}

export function getAdminParcelDisplayStatus(input: {
  status: ParcelStatus;
  pickupType?: ShipmentPickupType | null;
  hasAssignedOutboundDelivery?: boolean;
}): string {
  const { status, pickupType } = input;

  switch (status) {
    case 'created':
      if (pickupType === 'merchant_dropoff') return 'En attente de dépôt';
      if (input.hasAssignedOutboundDelivery) return 'Chauffeur assigné';
      if (pickupType === 'courier_pickup') return 'En attente de prise en charge';
      return 'Créé';
    case 'in_transit':
      return 'En cours de transport';
    case 'delivered_to_locker':
      return 'Au casier';
    case 'ready_for_pickup':
      return 'Prêt au retrait';
    case 'collected':
      return 'Retiré';
    case 'return_at_point':
      return 'Retour au casier';
    case 'returning':
      return 'Retour en transport';
    case 'returned':
      return 'Retourné';
    default:
      return status;
  }
}

export function getAdminDeliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case 'assigned':
      return 'Assignée';
    case 'scanned':
      return 'Prise en charge';
    case 'drop_off_pending':
      return 'Dépôt en cours';
    case 'completed':
      return 'Terminée';
    case 'failed':
      return 'Échouée';
    default:
      return status;
  }
}

export function getAdminDeliveryKindLabel(kind: DeliveryKind): string {
  if (kind === 'customer_return') return 'Retour client';
  if (kind === 'return') return 'Retour non retiré (historique)';
  return 'Aller';
}

export function getAdminReturnProcessLabel(status: ParcelReturnStatus): string {
  switch (status) {
    case 'requested':
      return 'Demandé';
    case 'authorized':
      return 'Autorisé';
    case 'awaiting_pickup':
      return 'En attente de collecte';
    case 'in_transit':
      return 'En transport';
    case 'completed':
      return 'Terminé';
    case 'rejected':
      return 'Refusé';
    case 'cancelled':
      return 'Annulé';
    default:
      return status;
  }
}

export function getAdminReturnMethodLabel(method: ParcelReturnMethod | null | undefined): string | null {
  if (method === 'eveider_return') return 'Retour Eveider';
  if (method === 'business_pickup') return 'Retrait par l’entreprise';
  return null;
}

export function isEveiderOutboundTransport(pickupType: ShipmentPickupType): boolean {
  return pickupType === 'courier_pickup';
}

export function isLegacyLockerType(type: string | null | undefined): boolean {
  return type != null && type !== 'SMART_LOCKER';
}

const TIMELINE_NOISE_KEYS = new Set([
  'sessionId',
  'lockerSessionId',
  'deviceEventId',
  'plc',
  'nodeRed',
  'token',
  'pinHash',
]);

export function summarizeAdminParcelEvent(payload: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (payload.kind === 'customer_return') parts.push('Retour client');
  if (payload.kind === 'return') parts.push('Retour non retiré (historique)');
  if (payload.kind === 'outbound') parts.push('Aller');
  if (payload.hasProof === true) parts.push('Preuve photo enregistrée');
  if (payload.issued === true) parts.push('Code émis');
  if (payload.pinInvalidated === true) parts.push('Code invalidé');
  if (typeof payload.channel === 'string') {
    parts.push(payload.channel === 'whatsapp' ? 'WhatsApp' : String(payload.channel));
  }
  if (typeof payload.template === 'string') parts.push(String(payload.template));
  if (typeof payload.reason === 'string') parts.push(String(payload.reason));
  if (typeof payload.compartmentLabel === 'string') {
    parts.push(`Compartiment ${payload.compartmentLabel}`);
  }
  if (payload.reason === 'admin_override') {
    parts.push('Mode de secours');
  }
  for (const key of Object.keys(payload)) {
    if (TIMELINE_NOISE_KEYS.has(key)) {
      /* hardware internals stay off the operator timeline */
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
