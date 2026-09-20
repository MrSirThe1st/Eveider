import type {
  DeliveryKind,
  DeliveryStatus,
  ParcelChargeKind,
  ParcelReturnMethod,
  ParcelReturnStatus,
  ParcelStatus,
  ShipmentPickupType,
} from '@eveider/domain';
import {
  getAdminDeliveryStatusLabel,
  getAdminParcelDisplayStatus,
  getAdminReturnMethodLabel,
  getAdminReturnProcessLabel,
  getFulfillmentMethodLabel,
  isEveiderOutboundTransport,
  summarizeAdminParcelEvent,
} from './admin-presentation';

export {
  getFulfillmentMethodLabel,
  isEveiderOutboundTransport,
  summarizeAdminParcelEvent as summarizeBusinessParcelEvent,
};

export type BusinessParcelAttentionFilter =
  | 'all'
  | 'awaiting_handoff'
  | 'awaiting_deposit'
  | 'in_transit'
  | 'at_locker'
  | 'ready_for_pickup'
  | 'collected'
  | 'returns';

export const BUSINESS_PARCEL_ATTENTION_FILTERS: {
  value: BusinessParcelAttentionFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Tous' },
  { value: 'awaiting_handoff', label: 'À remettre' },
  { value: 'awaiting_deposit', label: 'À déposer' },
  { value: 'in_transit', label: 'En transport' },
  { value: 'at_locker', label: 'Au casier' },
  { value: 'ready_for_pickup', label: 'Prêts au retrait' },
  { value: 'collected', label: 'Retirés' },
  { value: 'returns', label: 'Retours' },
];

export function getBusinessParcelDisplayStatus(input: {
  status: ParcelStatus;
  pickupType?: ShipmentPickupType | null;
  hasAssignedOutboundDelivery?: boolean;
}): string {
  return getAdminParcelDisplayStatus(input);
}

export function getBusinessDeliveryStatusLabel(status: DeliveryStatus): string {
  return getAdminDeliveryStatusLabel(status);
}

export function getBusinessDeliveryKindLabel(kind: DeliveryKind): string {
  if (kind === 'customer_return') return 'Retour Eveider';
  if (kind === 'return') return 'Retour non retiré (historique)';
  return 'Transport Eveider';
}

export function getBusinessReturnProcessLabel(status: ParcelReturnStatus): string {
  return getAdminReturnProcessLabel(status);
}

export function getBusinessReturnMethodLabel(
  method: ParcelReturnMethod | null | undefined,
): string | null {
  return getAdminReturnMethodLabel(method);
}

export function getBusinessChargeLabel(kind: ParcelChargeKind): string {
  switch (kind) {
    case 'outbound_delivery':
    case 'delivery_fee':
      return kind === 'delivery_fee' ? 'Livraison Eveider (historique)' : 'Livraison Eveider';
    case 'locker_collection':
    case 'drop_off_fee':
      return kind === 'drop_off_fee' ? 'Retrait au casier (historique)' : 'Retrait au casier';
    case 'return_delivery':
      return 'Retour Eveider';
    case 'return_locker':
      return 'Retrait du retour par l’entreprise';
    case 'locker_rental':
      return 'Stockage';
    default:
      return kind;
  }
}

export function isBusinessOwedCharge(kind: ParcelChargeKind, payer?: 'business' | 'recipient'): boolean {
  if (payer === 'recipient') return false;
  return kind === 'return_delivery' || kind === 'return_locker' || kind === 'locker_rental';
}

export function matchesBusinessAttention(
  input: {
    status: ParcelStatus;
    pickupType: ShipmentPickupType;
    customerReturnStatus?: ParcelReturnStatus | null;
  },
  attention: BusinessParcelAttentionFilter,
): boolean {
  if (attention === 'all') return true;
  if (attention === 'awaiting_handoff') {
    return input.status === 'created' && input.pickupType === 'courier_pickup';
  }
  if (attention === 'awaiting_deposit') {
    return input.status === 'created' && input.pickupType === 'merchant_dropoff';
  }
  if (attention === 'in_transit') return input.status === 'in_transit';
  if (attention === 'at_locker') return input.status === 'delivered_to_locker';
  if (attention === 'ready_for_pickup') return input.status === 'ready_for_pickup';
  if (attention === 'collected') return input.status === 'collected';
  if (attention === 'returns') {
    return (
      input.status === 'return_at_point' ||
      input.status === 'returning' ||
      input.status === 'returned' ||
      input.customerReturnStatus === 'requested' ||
      input.customerReturnStatus === 'authorized' ||
      input.customerReturnStatus === 'awaiting_pickup'
    );
  }
  return true;
}

export function getBusinessAttentionLabel(input: {
  status: ParcelStatus;
  pickupType: ShipmentPickupType;
  customerReturnStatus?: ParcelReturnStatus | null;
}): string | null {
  if (input.customerReturnStatus === 'requested') return 'Retour à examiner';
  if (input.status === 'return_at_point') {
    return 'Retour à récupérer';
  }
  if (input.status === 'created' && input.pickupType === 'courier_pickup') {
    return 'À remettre à Eveider';
  }
  if (input.status === 'created' && input.pickupType === 'merchant_dropoff') {
    return 'À déposer au casier';
  }
  return null;
}
