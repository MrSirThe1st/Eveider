import type { AdminDeliveryListItem } from '@eveider/data-access';
import { DELIVERY_STATUS_LABELS, PARCEL_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';
import ExcelJS from 'exceljs';
import { DELIVERY_EXPORT_HEADERS } from '@/lib/export/parcel-columns';
import { appendRows, formatExportDate, styleHeaderRow } from '@/lib/export/xlsx-utils';

export type BoardExportItem = {
  id: string;
  kind: 'delivery' | 'parcel';
  status: string;
  statusLabel: string;
  updatedAt: string;
  courier: { fullName: string | null; email: string | null } | null;
  parcel: {
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    recipientPhone: string;
    business: { name: string };
    locker: { code: string; name: string } | null;
    compartment: { label: string } | null;
  };
};

function deliveryToExportRow(item: BoardExportItem): Array<string | number | null> {
  const courierLabel =
    item.courier?.fullName?.trim() ||
    item.courier?.email?.trim() ||
    (item.kind === 'delivery' ? '—' : '');

  return [
    item.kind === 'delivery' ? item.id : '',
    item.statusLabel,
    courierLabel,
    item.parcel.trackingNumber,
    item.parcel.reference,
    item.parcel.business.name,
    item.parcel.recipientName,
    item.parcel.recipientPhone,
    item.parcel.locker?.code ?? '',
    item.parcel.locker?.name ?? '',
    item.parcel.compartment?.label ?? '',
    PARCEL_STATUS_LABELS[item.parcel.status as keyof typeof PARCEL_STATUS_LABELS] ??
      item.parcel.status,
    formatExportDate(item.updatedAt),
  ];
}

export function adminDeliveryToBoardExportItem(delivery: AdminDeliveryListItem): BoardExportItem {
  return {
    id: delivery.id,
    kind: 'delivery',
    status: delivery.status,
    statusLabel: DELIVERY_STATUS_LABELS[delivery.status as DeliveryStatus],
    updatedAt: delivery.updatedAt.toISOString(),
    courier: delivery.courier,
    parcel: {
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

export async function buildDeliveriesExportWorkbook(items: BoardExportItem[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Livraisons');
  sheet.addRow([...DELIVERY_EXPORT_HEADERS]);
  styleHeaderRow(sheet, DELIVERY_EXPORT_HEADERS.length);
  appendRows(sheet, items.map(deliveryToExportRow));
  return workbook;
}
