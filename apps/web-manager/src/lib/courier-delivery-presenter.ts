import {
  canAcceptDropOff,
  DELIVERY_KIND_LABELS,
  DELIVERY_STATUS_LABELS,
  LOCKER_STATUS_LABELS,
  type DeliveryKind,
  type DeliveryStatus,
  type LockerStatus,
} from '@eveider/domain';

export type CourierDeliveryDto = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  kind: DeliveryKind;
  kindLabel: string;
  scannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasDropOffPhoto: boolean;
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    businessName: string;
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      status: LockerStatus;
      statusLabel: string;
      canAcceptDropOff: boolean;
    } | null;
    compartmentId: string | null;
    compartmentLabel: string | null;
  };
};

export function toCourierDeliveryDto(delivery: {
  id: string;
  status: DeliveryStatus;
  kind?: DeliveryKind;
  scannedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasDropOffPhoto: boolean;
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    business: { name: string };
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      status: LockerStatus;
    } | null;
    compartment: { id: string; label: string } | null;
  };
}): CourierDeliveryDto {
  return {
    id: delivery.id,
    status: delivery.status,
    statusLabel: DELIVERY_STATUS_LABELS[delivery.status],
    kind: delivery.kind ?? 'outbound',
    kindLabel: DELIVERY_KIND_LABELS[delivery.kind ?? 'outbound'],
    scannedAt: delivery.scannedAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
    hasDropOffPhoto: delivery.hasDropOffPhoto,
    parcel: {
      id: delivery.parcel.id,
      trackingNumber: delivery.parcel.trackingNumber,
      reference: delivery.parcel.reference,
      status: delivery.parcel.status,
      recipientName: delivery.parcel.recipientName,
      businessName: delivery.parcel.business.name,
      locker: delivery.parcel.locker
        ? {
            id: delivery.parcel.locker.id,
            name: delivery.parcel.locker.name,
            address: delivery.parcel.locker.address,
            latitude: delivery.parcel.locker.latitude ?? null,
            longitude: delivery.parcel.locker.longitude ?? null,
            status: delivery.parcel.locker.status,
            statusLabel: LOCKER_STATUS_LABELS[delivery.parcel.locker.status],
            canAcceptDropOff: canAcceptDropOff(delivery.parcel.locker.status),
          }
        : null,
      compartmentId: delivery.parcel.compartment?.id ?? null,
      compartmentLabel: delivery.parcel.compartment?.label ?? null,
    },
  };
}
