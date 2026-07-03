import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

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
  reference: string;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  locker: LockerSummaryDto | null;
  business: BusinessSummaryDto;
  createdAt: string;
  updatedAt: string;
};

export function toAdminParcelDto(parcel: {
  id: string;
  reference: string;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  locker?: { id: string; name: string; address: string } | null;
  business: { id: string; name: string };
}): AdminParcelDto {
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
    business: { id: parcel.business.id, name: parcel.business.name },
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}
