import {
  CHARGE_PAYER_LABELS,
  formatDeliveryFee,
  PACKAGE_SIZE_LABELS,
  PARCEL_CHARGE_KIND_LABELS,
  PARCEL_EVENT_ACTOR_TYPE_LABELS,
  PARCEL_EVENT_TYPE_LABELS,
  type ChargePayer,
  type DeliveryPricingCurrency,
  type DeliveryStatus,
  type PackageSize,
  type ParcelChargeKind,
  type ParcelEventActorType,
  type ParcelEventType,
  type ParcelStatus,
  type ShipmentPickupType,
} from '@eveider/domain';
import {
  getAdminParcelDisplayStatus,
  getFulfillmentMethodLabel,
  summarizeAdminParcelEvent,
} from '@/lib/admin-presentation';

export type LockerSummaryDto = {
  id: string;
  name: string;
  address: string;
};

export type BusinessSummaryDto = {
  id: string;
  name: string;
};

export type AdminParcelDto = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  locker: LockerSummaryDto | null;
  business: BusinessSummaryDto;
  pickupType: ShipmentPickupType;
  pickupTypeLabel: string;
  deliveryFeeAmount: number | null;
  deliveryFeeCurrency: DeliveryPricingCurrency;
  deliveryFeeLabel: string | null;
  deliveryDistanceKm: number | null;
  pricingSizeUsed: PackageSize | null;
  pricingSizeLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toAdminParcelDto(parcel: {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  pickupType?: ShipmentPickupType;
  createdAt: Date;
  updatedAt: Date;
  locker?: { id: string; name: string; address: string } | null;
  business: { id: string; name: string };
  deliveryFeeAmount?: number | null;
  deliveryFeeCurrency?: DeliveryPricingCurrency | null;
  deliveryDistanceKm?: number | null;
  pricingSizeUsed?: PackageSize | null;
}): AdminParcelDto {
  const currency = parcel.deliveryFeeCurrency === 'USD' ? 'USD' : 'CDF';
  const pickupType = parcel.pickupType ?? 'courier_pickup';
  return {
    id: parcel.id,
    trackingNumber: parcel.trackingNumber,
    reference: parcel.reference,
    status: parcel.status,
    statusLabel: getAdminParcelDisplayStatus({
      status: parcel.status,
      pickupType,
    }),
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    lockerId: parcel.lockerId,
    locker: parcel.locker
      ? { id: parcel.locker.id, name: parcel.locker.name, address: parcel.locker.address }
      : null,
    business: { id: parcel.business.id, name: parcel.business.name },
    pickupType,
    pickupTypeLabel: getFulfillmentMethodLabel(pickupType),
    deliveryFeeAmount: parcel.deliveryFeeAmount ?? null,
    deliveryFeeCurrency: currency,
    deliveryFeeLabel:
      parcel.deliveryFeeAmount != null
        ? formatDeliveryFee(parcel.deliveryFeeAmount, currency)
        : null,
    deliveryDistanceKm: parcel.deliveryDistanceKm ?? null,
    pricingSizeUsed: parcel.pricingSizeUsed ?? null,
    pricingSizeLabel: parcel.pricingSizeUsed
      ? PACKAGE_SIZE_LABELS[parcel.pricingSizeUsed]
      : null,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}

export type AdminParcelEventDto = {
  id: string;
  eventType: ParcelEventType;
  eventTypeLabel: string;
  actorType: ParcelEventActorType;
  actorLabel: string;
  previousParcelStatus: ParcelStatus | null;
  newParcelStatus: ParcelStatus | null;
  previousDeliveryStatus: DeliveryStatus | null;
  newDeliveryStatus: DeliveryStatus | null;
  summary: string | null;
  createdAt: string;
};

function eventSummary(payload: Record<string, unknown>): string | null {
  return summarizeAdminParcelEvent(payload);
}

/** Shared DTO for admin and organisation Colis Historique timelines. */
export type ParcelEventDto = AdminParcelEventDto;

export function toParcelEventDto(event: {
  id: string;
  eventType: ParcelEventType;
  actorType: ParcelEventActorType;
  actorFullName: string | null;
  actorEmail: string | null;
  previousParcelStatus: ParcelStatus | null;
  newParcelStatus: ParcelStatus | null;
  previousDeliveryStatus: DeliveryStatus | null;
  newDeliveryStatus: DeliveryStatus | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}): ParcelEventDto {
  const actorLabel =
    event.actorType === 'system'
      ? PARCEL_EVENT_ACTOR_TYPE_LABELS.system
      : event.actorFullName?.trim() ||
        event.actorEmail?.trim() ||
        PARCEL_EVENT_ACTOR_TYPE_LABELS[event.actorType];

  return {
    id: event.id,
    eventType: event.eventType,
    eventTypeLabel: PARCEL_EVENT_TYPE_LABELS[event.eventType],
    actorType: event.actorType,
    actorLabel,
    previousParcelStatus: event.previousParcelStatus,
    newParcelStatus: event.newParcelStatus,
    previousDeliveryStatus: event.previousDeliveryStatus,
    newDeliveryStatus: event.newDeliveryStatus,
    summary: eventSummary(event.payload),
    createdAt: event.createdAt.toISOString(),
  };
}

/** @deprecated Use toParcelEventDto */
export const toAdminParcelEventDto = toParcelEventDto;

export type AdminParcelChargeDto = {
  id: string;
  kind: ParcelChargeKind;
  kindLabel: string;
  payer: ChargePayer;
  payerLabel: string;
  amountLabel: string;
  historical: boolean;
};

export function toAdminParcelChargeDto(charge: {
  id: string;
  kind: ParcelChargeKind;
  payer: ChargePayer;
  amount: number;
  currency: DeliveryPricingCurrency;
}): AdminParcelChargeDto {
  return {
    id: charge.id,
    kind: charge.kind,
    kindLabel: PARCEL_CHARGE_KIND_LABELS[charge.kind],
    payer: charge.payer,
    payerLabel: CHARGE_PAYER_LABELS[charge.payer],
    amountLabel: formatDeliveryFee(charge.amount, charge.currency),
    historical: charge.kind === 'delivery_fee' || charge.kind === 'drop_off_fee',
  };
}
