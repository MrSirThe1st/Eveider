import { PARCEL_STATUS_LABELS, type DeliveryStatus, type ParcelStatus } from '@eveider/domain';
import type { PickupPaymentStatus } from '@eveider/api-contracts';

export type PickupPaymentDto = {
  required: boolean;
  status: PickupPaymentStatus;
  amount: string | null;
  currency: string | null;
  provider: string | null;
  depositId: string | null;
  failureReason: string | null;
};

export type CustomerParcelDto = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
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
  pickupPin: string | null;
  pickupPayment: PickupPaymentDto | null;
  deliveryStatus: DeliveryStatus | null;
  createdAt: string;
  updatedAt: string;
};

export function toCustomerParcelDto(
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: ParcelStatus;
    recipientName: string | null;
    createdAt: Date;
    updatedAt: Date;
    business: { name: string };
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    compartment: { label: string } | null;
    pickupPin: { code: string } | null;
    deliveries?: { status: DeliveryStatus }[];
  },
  options?: {
    pickupPayment?: PickupPaymentDto | null;
    pickupPaid?: boolean;
  },
): CustomerParcelDto {
  const pickupPayment =
    parcel.status === 'ready_for_pickup' ? (options?.pickupPayment ?? null) : null;
  const showPin =
    parcel.status === 'ready_for_pickup' &&
    (options?.pickupPaid ??
      (!pickupPayment?.required || pickupPayment?.status === 'completed'));

  return {
    id: parcel.id,
    trackingNumber: parcel.trackingNumber,
    reference: parcel.reference,
    status: parcel.status,
    statusLabel: PARCEL_STATUS_LABELS[parcel.status],
    recipientName: parcel.recipientName,
    businessName: parcel.business.name,
    locker: parcel.locker
      ? {
          id: parcel.locker.id,
          name: parcel.locker.name,
          address: parcel.locker.address,
          latitude: parcel.locker.latitude ?? null,
          longitude: parcel.locker.longitude ?? null,
        }
      : null,
    compartmentLabel: parcel.compartment?.label ?? null,
    pickupPin: showPin ? (parcel.pickupPin?.code ?? null) : null,
    pickupPayment,
    deliveryStatus: parcel.deliveries?.[0]?.status ?? null,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}
