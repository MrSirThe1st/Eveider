import type { AdminDeliveryListItem } from '@eveider/data-access';
import type { DeliveryKind, DeliveryStatus } from '@eveider/domain';
import { getAdminDeliveryKindLabel, getAdminDeliveryStatusLabel } from '@/lib/admin-presentation';

export type AdminDeliveryDto = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  deliveryKind: DeliveryKind;
  deliveryKindLabel: string;
  scannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  courier: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    recipientPhone: string;
    business: { id: string; name: string };
    locker: { id: string; name: string; code: string; address: string } | null;
    compartment: { label: string; size: string } | null;
  };
};

export function toAdminDeliveryDto(delivery: AdminDeliveryListItem): AdminDeliveryDto {
  const deliveryKind = delivery.kind;
  return {
    id: delivery.id,
    status: delivery.status as DeliveryStatus,
    statusLabel: getAdminDeliveryStatusLabel(delivery.status as DeliveryStatus),
    deliveryKind,
    deliveryKindLabel: getAdminDeliveryKindLabel(deliveryKind),
    scannedAt: delivery.scannedAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
    courier: delivery.courier,
    parcel: {
      id: delivery.parcel.id,
      trackingNumber: delivery.parcel.trackingNumber,
      reference: delivery.parcel.reference,
      status: delivery.parcel.status,
      recipientName: delivery.parcel.recipientName,
      recipientPhone: delivery.parcel.recipientPhone,
      business: delivery.parcel.business,
      locker: delivery.parcel.locker,
      compartment: delivery.parcel.compartment,
    },
  };
}
