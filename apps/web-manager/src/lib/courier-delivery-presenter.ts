import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';

export type CourierDeliveryDto = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  scannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parcel: {
    id: string;
    reference: string;
    status: string;
    recipientName: string | null;
    businessName: string;
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    compartmentLabel: string | null;
  };
};

export function toCourierDeliveryDto(delivery: {
  id: string;
  status: DeliveryStatus;
  scannedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  parcel: {
    id: string;
    reference: string;
    status: string;
    recipientName: string | null;
    business: { name: string };
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    compartment: { label: string } | null;
  };
}): CourierDeliveryDto {
  return {
    id: delivery.id,
    status: delivery.status,
    statusLabel: DELIVERY_STATUS_LABELS[delivery.status],
    scannedAt: delivery.scannedAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
    parcel: {
      id: delivery.parcel.id,
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
          }
        : null,
      compartmentLabel: delivery.parcel.compartment?.label ?? null,
    },
  };
}
