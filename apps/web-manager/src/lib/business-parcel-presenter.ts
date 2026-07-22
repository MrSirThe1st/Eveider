import { COMPARTMENT_SIZE_FULL_LABELS, PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

export type LockerSummaryDto = {
  id: string;
  name: string;
  address: string;
};

export type CompartmentSummaryDto = {
  id: string;
  label: string;
  size: 'small' | 'medium' | 'large';
  sizeLabel: string;
};

export type ParcelDto = {
  id: string;
  reference: string;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  locker: LockerSummaryDto | null;
  compartment: CompartmentSummaryDto | null;
  createdAt: string;
  updatedAt: string;
};

export function toParcelDto(parcel: {
  id: string;
  reference: string;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  locker?: { id: string; name: string; address: string } | null;
  compartment?: { id: string; label: string; size: 'small' | 'medium' | 'large' } | null;
}): ParcelDto {
  return {
    id: parcel.id,
    reference: parcel.reference,
    status: parcel.status,
    statusLabel: PARCEL_STATUS_LABELS[parcel.status],
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    lockerId: parcel.lockerId,
    locker: parcel.locker
      ? { id: parcel.locker.id, name: parcel.locker.name, address: parcel.locker.address }
      : null,
    compartment: parcel.compartment
      ? {
          id: parcel.compartment.id,
          label: parcel.compartment.label,
          size: parcel.compartment.size,
          sizeLabel: COMPARTMENT_SIZE_FULL_LABELS[parcel.compartment.size],
        }
      : null,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}
