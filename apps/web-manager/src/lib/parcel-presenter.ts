import {
  formatDeliveryFeeFc,
  PACKAGE_SIZE_LABELS,
  PARCEL_EVENT_ACTOR_TYPE_LABELS,
  PARCEL_EVENT_TYPE_LABELS,
  PARCEL_STATUS_LABELS,
  type DeliveryStatus,
  type PackageSize,
  type ParcelEventActorType,
  type ParcelEventType,
  type ParcelStatus,
} from '@eveider/domain';

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
  deliveryFeeFc: number | null;
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
  createdAt: Date;
  updatedAt: Date;
  locker?: { id: string; name: string; address: string } | null;
  business: { id: string; name: string };
  deliveryFeeFc?: number | null;
  deliveryDistanceKm?: number | null;
  pricingSizeUsed?: PackageSize | null;
}): AdminParcelDto {
  return {
    id: parcel.id,
    trackingNumber: parcel.trackingNumber,
    reference: parcel.reference,
    status: parcel.status,
    statusLabel: PARCEL_STATUS_LABELS[parcel.status],
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    lockerId: parcel.lockerId,
    locker: parcel.locker
      ? { id: parcel.locker.id, name: parcel.locker.name, address: parcel.locker.address }
      : null,
    business: { id: parcel.business.id, name: parcel.business.name },
    deliveryFeeFc: parcel.deliveryFeeFc ?? null,
    deliveryFeeLabel:
      parcel.deliveryFeeFc != null ? formatDeliveryFeeFc(parcel.deliveryFeeFc) : null,
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
  const parts: string[] = [];
  if (payload.kind === 'return') parts.push('Retour');
  if (payload.hasProof === true) parts.push('Preuve photo enregistrée');
  if (payload.issued === true) parts.push('Code émis');
  if (payload.pinInvalidated === true) parts.push('Code invalidé');
  if (typeof payload.channel === 'string') {
    const channel = payload.channel === 'whatsapp' ? 'WhatsApp' : String(payload.channel);
    parts.push(channel);
  }
  if (typeof payload.template === 'string') parts.push(String(payload.template));
  if (typeof payload.type === 'string') parts.push(String(payload.type));
  if (typeof payload.reason === 'string') parts.push(String(payload.reason));
  if (typeof payload.compartmentLabel === 'string') {
    parts.push(`Compartiment ${payload.compartmentLabel}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
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
