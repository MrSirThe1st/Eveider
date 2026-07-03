import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

export type LockerSummaryDto = {
  id: string;
  name: string;
  address: string;
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
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}
