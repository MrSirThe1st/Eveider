import {
  BUSINESS_PARCEL_LOCATION_LABELS,
  BUSINESS_PARCEL_PROGRESSION_LABELS,
  COMPARTMENT_SIZE_FULL_LABELS,
  formatDeliveryFeeFc,
  markBusinessParcelProgression,
  PACKAGE_CATEGORY_LABELS,
  PACKAGE_SIZE_LABELS,
  PARCEL_STATUS_LABELS,
  PAYMENT_RESPONSIBILITY_LABELS,
  resolveBusinessParcelLocation,
  SHIPMENT_PICKUP_TYPE_LABELS,
  type BusinessParcelLocation,
  type BusinessParcelProgressionStep,
  type DeliveryStatus,
  type PackageCategory,
  type PackageSize,
  type ParcelStatus,
  type PaymentResponsibility,
  type ShipmentPickupType,
} from '@eveider/domain';

export type LockerSummaryDto = {
  id: string;
  name: string;
  address: string;
  type?: string;
};

export type CompartmentSummaryDto = {
  id: string;
  label: string;
  size: 'small' | 'medium' | 'large';
  sizeLabel: string;
};

export type ParcelDto = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  locker: LockerSummaryDto | null;
  compartment: CompartmentSummaryDto | null;
  pickupType: ShipmentPickupType;
  pickupTypeLabel: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  packageSize: PackageSize;
  packageSizeLabel: string;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageWeightKg: number | null;
  packageCategory: PackageCategory;
  packageCategoryLabel: string;
  declaredValueCdf: number | null;
  declaredValueUsd: number | null;
  paymentResponsibility: PaymentResponsibility;
  paymentResponsibilityLabel: string;
  codAmountCdf: number | null;
  codAmountUsd: number | null;
  deliveryFeeFc: number | null;
  deliveryFeeLabel: string | null;
  deliveryDistanceKm: number | null;
  pricingSizeUsed: PackageSize | null;
  pricingSizeLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toParcelDto(parcel: {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  pickupType: ShipmentPickupType;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  packageSize: PackageSize;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageWeightKg: number | null;
  packageCategory: PackageCategory;
  declaredValueCdf: number | null;
  declaredValueUsd: number | null;
  paymentResponsibility: PaymentResponsibility;
  codAmountCdf: number | null;
  codAmountUsd: number | null;
  deliveryFeeFc?: number | null;
  deliveryDistanceKm?: number | null;
  pricingSizeUsed?: PackageSize | null;
  createdAt: Date;
  updatedAt: Date;
  locker?: { id: string; name: string; address: string; type?: string } | null;
  compartment?: { id: string; label: string; size: 'small' | 'medium' | 'large' } | null;
}): ParcelDto {
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
      ? {
          id: parcel.locker.id,
          name: parcel.locker.name,
          address: parcel.locker.address,
          type: parcel.locker.type,
        }
      : null,
    compartment: parcel.compartment
      ? {
          id: parcel.compartment.id,
          label: parcel.compartment.label,
          size: parcel.compartment.size,
          sizeLabel: COMPARTMENT_SIZE_FULL_LABELS[parcel.compartment.size],
        }
      : null,
    pickupType: parcel.pickupType,
    pickupTypeLabel: SHIPMENT_PICKUP_TYPE_LABELS[parcel.pickupType],
    senderName: parcel.senderName,
    senderPhone: parcel.senderPhone,
    senderAddress: parcel.senderAddress,
    packageSize: parcel.packageSize,
    packageSizeLabel: PACKAGE_SIZE_LABELS[parcel.packageSize],
    packageLengthCm: parcel.packageLengthCm,
    packageWidthCm: parcel.packageWidthCm,
    packageHeightCm: parcel.packageHeightCm,
    packageWeightKg: parcel.packageWeightKg,
    packageCategory: parcel.packageCategory,
    packageCategoryLabel: PACKAGE_CATEGORY_LABELS[parcel.packageCategory],
    declaredValueCdf: parcel.declaredValueCdf,
    declaredValueUsd: parcel.declaredValueUsd,
    paymentResponsibility: parcel.paymentResponsibility,
    paymentResponsibilityLabel: PAYMENT_RESPONSIBILITY_LABELS[parcel.paymentResponsibility],
    codAmountCdf: parcel.codAmountCdf,
    codAmountUsd: parcel.codAmountUsd,
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

export type BusinessParcelProgressionItem = {
  step: BusinessParcelProgressionStep;
  label: string;
  reached: boolean;
  current: boolean;
};

export type BusinessParcelLocationView = {
  location: BusinessParcelLocation;
  locationLabel: string;
  progression: BusinessParcelProgressionItem[];
};

export function toBusinessParcelLocationView(input: {
  status: ParcelStatus;
  pickupType: ShipmentPickupType;
  latestDeliveryStatus: DeliveryStatus | null;
}): BusinessParcelLocationView {
  const resolved = {
    parcelStatus: input.status,
    pickupType: input.pickupType,
    latestDeliveryStatus: input.latestDeliveryStatus,
  };
  const location = resolveBusinessParcelLocation(resolved);
  return {
    location,
    locationLabel: BUSINESS_PARCEL_LOCATION_LABELS[location],
    progression: markBusinessParcelProgression(resolved).map((mark) => ({
      step: mark.step,
      label: BUSINESS_PARCEL_PROGRESSION_LABELS[mark.step],
      reached: mark.reached,
      current: mark.current,
    })),
  };
}
