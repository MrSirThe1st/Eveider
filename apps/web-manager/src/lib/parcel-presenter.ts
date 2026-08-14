import { formatDeliveryFeeFc, PARCEL_STATUS_LABELS, PACKAGE_SIZE_LABELS, type PackageSize, type ParcelStatus } from '@eveider/domain';

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
