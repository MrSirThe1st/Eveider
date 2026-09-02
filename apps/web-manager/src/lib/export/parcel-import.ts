import {
  createParcelSchema,
  PARCEL_IMPORT_MAX_ROWS,
  type ParcelImportPreviewRow,
} from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
  isCodAllowedForLockerType,
  normalizePointCode,
  PACKAGE_CATEGORIES,
  PACKAGE_CATEGORY_LABELS,
  PACKAGE_SIZE_LABELS,
  PACKAGE_SIZES,
  PAYMENT_RESPONSIBILITY_LABELS,
  PAYMENT_RESPONSIBILITIES,
  SHIPMENT_PICKUP_TYPE_LABELS,
  SHIPMENT_PICKUP_TYPES,
  type PackageCategory,
  type PackageSize,
  type PaymentResponsibility,
  type ShipmentPickupType,
} from '@eveider/domain';
import ExcelJS from 'exceljs';
import {
  PARCEL_IMPORT_EXAMPLE_ROW,
  PARCEL_IMPORT_HEADERS,
  PARCEL_IMPORT_INSTRUCTIONS,
  PARCEL_IMPORT_SHEET,
  PARCEL_INSTRUCTIONS_SHEET,
} from '@/lib/export/parcel-columns';
import { cellToNumber, cellToString, styleHeaderRow } from '@/lib/export/xlsx-utils';

type LockerLookup = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
};

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function buildReverseMap<T extends string>(labels: Record<T, string>, values: readonly T[]) {
  const map = new Map<string, T>();
  for (const value of values) {
    map.set(normalizeKey(value), value);
    map.set(normalizeKey(labels[value]), value);
  }
  return map;
}

const pickupTypeMap = buildReverseMap(SHIPMENT_PICKUP_TYPE_LABELS, SHIPMENT_PICKUP_TYPES);
const paymentMap = buildReverseMap(PAYMENT_RESPONSIBILITY_LABELS, PAYMENT_RESPONSIBILITIES);
const categoryMap = buildReverseMap(PACKAGE_CATEGORY_LABELS, PACKAGE_CATEGORIES);
const sizeMap = buildReverseMap(PACKAGE_SIZE_LABELS, PACKAGE_SIZES);

const SIZE_ALIASES: Record<string, PackageSize> = {
  s: 'small',
  m: 'medium',
  l: 'large',
  petit: 'small',
  moyen: 'medium',
  grand: 'large',
  small: 'small',
  medium: 'medium',
  large: 'large',
};

function parsePickupType(raw: string): ShipmentPickupType | null {
  return pickupTypeMap.get(normalizeKey(raw)) ?? null;
}

function parsePayment(raw: string): PaymentResponsibility | null {
  return paymentMap.get(normalizeKey(raw)) ?? null;
}

function parseCategory(raw: string): PackageCategory | null {
  return categoryMap.get(normalizeKey(raw)) ?? null;
}

function parseSize(raw: string): PackageSize | null {
  const normalized = normalizeKey(raw);
  return sizeMap.get(normalized) ?? SIZE_ALIASES[normalized] ?? null;
}

function rowIsEmpty(values: string[]): boolean {
  return values.every((value) => value.length === 0);
}

function readImportRow(row: ExcelJS.Row): string[] {
  return PARCEL_IMPORT_HEADERS.map((_, index) => cellToString(row.getCell(index + 1).value));
}

export async function buildParcelImportTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Eveider';
  workbook.created = new Date();

  const dataSheet = workbook.addWorksheet(PARCEL_IMPORT_SHEET);
  dataSheet.addRow([...PARCEL_IMPORT_HEADERS]);
  dataSheet.addRow([...PARCEL_IMPORT_EXAMPLE_ROW]);
  styleHeaderRow(dataSheet, PARCEL_IMPORT_HEADERS.length);

  const instructionsSheet = workbook.addWorksheet(PARCEL_INSTRUCTIONS_SHEET);
  for (const line of PARCEL_IMPORT_INSTRUCTIONS) {
    instructionsSheet.addRow(line);
  }
  instructionsSheet.getColumn(1).width = 24;
  instructionsSheet.getColumn(2).width = 72;

  return workbook;
}

export async function parseParcelImportWorkbook(
  buffer: ArrayBuffer,
): Promise<{ rows: ParcelImportPreviewRow[]; totalRows: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet =
    workbook.getWorksheet(PARCEL_IMPORT_SHEET) ??
    workbook.worksheets.find((worksheet) => worksheet.rowCount > 0) ??
    null;

  if (!sheet) {
    throw new Error('Feuille « Colis » introuvable dans le fichier Excel');
  }

  const parsedRows: Array<{ rowNumber: number; values: string[] }> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = readImportRow(row);
    if (rowIsEmpty(values)) return;
    parsedRows.push({ rowNumber, values });
  });

  if (parsedRows.length === 0) {
    throw new Error('Aucune ligne de colis trouvée dans le fichier');
  }
  if (parsedRows.length > PARCEL_IMPORT_MAX_ROWS) {
    throw new Error(`Maximum ${PARCEL_IMPORT_MAX_ROWS} lignes par import`);
  }

  const pointCodes = parsedRows
    .map((row) => normalizePointCode(row.values[8] ?? ''))
    .filter(Boolean);
  const { lockers } = createRepositories();
  const lockerByCode = await lockers.findByCodes(pointCodes);

  const rows: ParcelImportPreviewRow[] = parsedRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const [
      reference,
      pickupTypeRaw,
      senderName,
      senderPhone,
      senderAddress,
      recipientName,
      recipientPhone,
      recipientEmail,
      pointCodeRaw,
      packageSizeRaw,
      categoryRaw,
      weightRaw,
      paymentRaw,
      codCdfRaw,
      codUsdRaw,
    ] = values;

    const pickupType = parsePickupType(pickupTypeRaw ?? '');
    if (!pickupType) errors.push('Mode enlèvement invalide');

    const packageSize = parseSize(packageSizeRaw ?? '');
    if (!packageSize) errors.push('Taille colis invalide');

    const packageCategory = parseCategory(categoryRaw ?? '');
    if (!packageCategory) errors.push('Catégorie invalide');

    const paymentResponsibility = parsePayment(paymentRaw ?? '');
    if (!paymentResponsibility) errors.push('Mode de paiement invalide');

    const pointCode = normalizePointCode(pointCodeRaw ?? '');
    const locker: LockerLookup | undefined = pointCode ? lockerByCode.get(pointCode) : undefined;
    if (!pointCode) {
      errors.push('Code point requis');
    } else if (!locker) {
      errors.push(`Code point inconnu : ${pointCode}`);
    } else if (locker.status !== 'active') {
      errors.push(`Point inactif : ${pointCode}`);
    }

    if (paymentResponsibility === 'cod' && locker && !isCodAllowedForLockerType(locker.type)) {
      errors.push('Paiement à la livraison indisponible sur ce type de point');
    }

    const packageWeightKg = cellToNumber(weightRaw);
    const codAmountCdf = cellToNumber(codCdfRaw);
    const codAmountUsd = cellToNumber(codUsdRaw);

    const candidate = {
      reference: reference || undefined,
      pickupType: pickupType ?? 'courier_pickup',
      senderName,
      senderPhone,
      senderAddress: senderAddress || undefined,
      recipientName,
      recipientPhone,
      recipientEmail: recipientEmail || undefined,
      lockerId: locker?.id ?? '00000000-0000-0000-0000-000000000000',
      packageSize: packageSize ?? 'medium',
      packageWeightKg,
      packageCategory: packageCategory ?? 'other',
      paymentResponsibility: paymentResponsibility ?? 'sender_pays',
      codAmountCdf,
      codAmountUsd,
    };

    const validated = createParcelSchema.safeParse(candidate);
    if (!validated.success) {
      for (const issue of validated.error.errors) {
        const message = issue.message;
        if (!errors.includes(message)) errors.push(message);
      }
    }

    const valid = errors.length === 0 && validated.success;
    return {
      rowNumber,
      valid,
      errors,
      data: valid ? validated.data : undefined,
    };
  });

  return { rows, totalRows: parsedRows.length };
}

export async function buildParcelImportErrorReportWorkbook(
  rows: Array<{ rowNumber: number; errors: string[] }>,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Erreurs');
  sheet.addRow(['Ligne', 'Erreurs']);
  styleHeaderRow(sheet, 2);
  for (const row of rows) {
    sheet.addRow([row.rowNumber, row.errors.join(' · ')]);
  }
  sheet.getColumn(2).width = 80;
  return workbook;
}
