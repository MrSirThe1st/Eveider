import type { ParcelWithLocker } from '@eveider/data-access';
import {
  BUSINESS_PARCEL_LOCATION_LABELS,
  PARCEL_STATUS_LABELS,
  resolveBusinessParcelLocation,
  type BusinessParcelLocation,
  type DeliveryKind,
  type DeliveryStatus,
} from '@eveider/domain';
import ExcelJS from 'exceljs';
import { toParcelDto } from '@/lib/business-parcel-presenter';
import {
  ADMIN_PARCEL_EXPORT_HEADERS,
  PARCEL_EXPORT_HEADERS,
} from '@/lib/export/parcel-columns';
import { appendRows, formatExportDate, styleHeaderRow } from '@/lib/export/xlsx-utils';

type BusinessExportContext = {
  latestDeliveryStatus: DeliveryStatus | null;
  latestDeliveryKind?: DeliveryKind | null;
};

function businessLocationForParcel(
  parcel: ParcelWithLocker,
  latestDeliveryStatus: DeliveryStatus | null,
  latestDeliveryKind?: DeliveryKind | null,
): string {
  const location = resolveBusinessParcelLocation({
    parcelStatus: parcel.status,
    pickupType: parcel.pickupType,
    latestDeliveryStatus,
    latestDeliveryKind,
  });
  return BUSINESS_PARCEL_LOCATION_LABELS[location];
}

export function parcelMatchesBusinessLocation(
  parcel: ParcelWithLocker,
  latestDeliveryStatus: DeliveryStatus | null,
  location: BusinessParcelLocation,
  latestDeliveryKind?: DeliveryKind | null,
): boolean {
  return (
    resolveBusinessParcelLocation({
      parcelStatus: parcel.status,
      pickupType: parcel.pickupType,
      latestDeliveryStatus,
      latestDeliveryKind,
    }) === location
  );
}

function parcelToExportRow(
  parcel: ParcelWithLocker,
  context?: BusinessExportContext,
  includeBusiness = false,
): Array<string | number | null> {
  const dto = toParcelDto(parcel);
  const locationLabel = context
    ? businessLocationForParcel(
        parcel,
        context.latestDeliveryStatus,
        context.latestDeliveryKind,
      )
    : PARCEL_STATUS_LABELS[parcel.status];

  const base = [
    dto.trackingNumber,
    dto.reference,
    ...(includeBusiness ? [parcel.business.name] : []),
    locationLabel,
    dto.statusLabel,
    dto.pickupTypeLabel,
    dto.senderName,
    dto.senderPhone,
    dto.senderAddress,
    dto.recipientName,
    dto.recipientPhone,
    '',
    parcel.locker?.code ?? '',
    parcel.locker?.name ?? '',
    dto.packageSizeLabel,
    dto.packageCategoryLabel,
    dto.packageWeightKg,
    dto.paymentResponsibilityLabel,
    dto.codAmountCdf,
    dto.codAmountUsd,
    dto.deliveryFeeFc,
    dto.deliveryDistanceKm,
    formatExportDate(dto.createdAt),
    formatExportDate(dto.updatedAt),
  ];

  return base;
}

export async function buildBusinessParcelsExportWorkbook(
  parcels: Array<{
    parcel: ParcelWithLocker;
    latestDeliveryStatus: DeliveryStatus | null;
    latestDeliveryKind?: DeliveryKind | null;
  }>,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Colis');
  sheet.addRow([...PARCEL_EXPORT_HEADERS]);
  styleHeaderRow(sheet, PARCEL_EXPORT_HEADERS.length);
  appendRows(
    sheet,
    parcels.map(({ parcel, latestDeliveryStatus, latestDeliveryKind }) =>
      parcelToExportRow(parcel, { latestDeliveryStatus, latestDeliveryKind }),
    ),
  );
  return workbook;
}

export async function buildAdminParcelsExportWorkbook(parcels: ParcelWithLocker[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Colis');
  sheet.addRow([...ADMIN_PARCEL_EXPORT_HEADERS]);
  styleHeaderRow(sheet, ADMIN_PARCEL_EXPORT_HEADERS.length);
  appendRows(
    sheet,
    parcels.map((parcel) => parcelToExportRow(parcel, undefined, true)),
  );
  return workbook;
}
