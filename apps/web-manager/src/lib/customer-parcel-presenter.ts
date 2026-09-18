import {
  PARCEL_STATUS_LABELS,
  canRequestCustomerReturn,
  type DeliveryStatus,
  type ParcelStatus,
  type ShipmentPickupType,
} from '@eveider/domain';
import type { PickupPaymentStatus } from '@eveider/api-contracts';
import type { ParcelReturnView } from '@/lib/parcel-return-presenter';

export type PickupPaymentDto = {
  required: boolean;
  status: PickupPaymentStatus;
  amount: string | null;
  currency: string | null;
  provider: string | null;
  depositId: string | null;
  failureReason: string | null;
  kind?: string | null;
  purpose?: string | null;
  integrityError?: 'CANONICAL_CHARGE_MISSING' | null;
  paymentProviderAvailable?: boolean;
};

export type CustomerParcelDto = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  businessName: string;
  pickupType: ShipmentPickupType;
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
  canRequestReturn: boolean;
  customerReturn: ParcelReturnView | null;
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
    pickupType: ShipmentPickupType;
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
    pickupPayment: PickupPaymentDto | null;
    pickupPaid?: boolean;
    customerReturn?: ParcelReturnView | null;
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
    pickupType: parcel.pickupType,
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
    canRequestReturn:
      canRequestCustomerReturn(parcel.status) &&
      (!options?.customerReturn ||
        (options.customerReturn.status !== 'requested' &&
          options.customerReturn.status !== 'authorized' &&
          options.customerReturn.status !== 'awaiting_pickup' &&
          options.customerReturn.status !== 'in_transit')),
    customerReturn: options?.customerReturn ?? null,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}
