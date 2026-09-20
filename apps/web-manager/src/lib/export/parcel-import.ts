import {
  createParcelSchema,
  PARCEL_IMPORT_MAX_ROWS,
  type ParcelImportPreviewRow,
} from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
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

type ImportField =
  | 'reference'
  | 'pickupType'
  | 'senderName'
  | 'senderPhone'
  | 'senderAddress'
  | 'recipientName'
  | 'recipientPhone'
  | 'recipientEmail'
  | 'lockerCode'
  | 'packageSize'
  | 'category'
  | 'weight'
  | 'payment'
  | 'codCdf'
  | 'codUsd';

const FIELD_ALIASES: Record<ImportField, string[]> = {
  reference: ['reference', 'référence'],
  pickupType: ['methode', 'méthode', 'mode enlevement', 'mode enlèvement'],
  senderName: ['nom expediteur', 'nom expéditeur'],
  senderPhone: ['telephone expediteur', 'téléphone expéditeur'],
  senderAddress: ['adresse expediteur', 'adresse expéditeur'],
  recipientName: ['nom destinataire'],
  recipientPhone: ['telephone destinataire', 'téléphone destinataire'],
  recipientEmail: ['email destinataire'],
  lockerCode: ['code casier', 'code point'],
  packageSize: ['taille colis'],
  category: ['categorie', 'catégorie'],
  weight: ['poids kg', 'poids'],
  payment: ['paiement'],
  codCdf: ['montant cod cdf'],
  codUsd: ['montant cod usd'],
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
pickupTypeMap.set(normalizeKey('Collecte Eveider'), 'courier_pickup');
pickupTypeMap.set(normalizeKey('Un chauffeur vient chercher'), 'courier_pickup');
pickupTypeMap.set(normalizeKey('Depot au casier'), 'merchant_dropoff');
pickupTypeMap.set(normalizeKey('Dépôt au casier'), 'merchant_dropoff');
pickupTypeMap.set(normalizeKey('Depot au point Eveider'), 'merchant_dropoff');
pickupTypeMap.set(normalizeKey('Dépôt au point Eveider'), 'merchant_dropoff');
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

function rowIsEmpty(values: Record<ImportField, string>): boolean {
  return Object.values(values).every((value) => value.length === 0);
}

function buildHeaderIndex(row: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>();
  row.eachCell((cell, colNumber) => {
    const key = normalizeKey(cellToString(cell.value));
    if (key) map.set(key, colNumber);
  });
  return map;
}

function readField(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  field: ImportField,
  fallbackCol: number | null,
): string {
  for (const alias of FIELD_ALIASES[field]) {
    const col = headerIndex.get(normalizeKey(alias));
    if (col) return cellToString(row.getCell(col).value);
  }
  if (fallbackCol != null) return cellToString(row.getCell(fallbackCol).value);
  return '';
}

function readImportFields(row: ExcelJS.Row, headerIndex: Map<string, number>): Record<ImportField, string> {
  const positional: Record<ImportField, number | null> = {
    reference: 1,
    pickupType: 2,
    senderName: 3,
    senderPhone: 4,
    senderAddress: 5,
    recipientName: 6,
    recipientPhone: 7,
    recipientEmail: 8,
    lockerCode: 9,
    packageSize: 10,
    category: 11,
    weight: 12,
    payment: null,
    codCdf: null,
    codUsd: null,
  };

  const values = {} as Record<ImportField, string>;
  for (const field of Object.keys(positional) as ImportField[]) {
    values[field] = readField(row, headerIndex, field, positional[field]);
  }
  return values;
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

  const headerIndex = buildHeaderIndex(sheet.getRow(1));
  const parsedRows: Array<{ rowNumber: number; values: Record<ImportField, string> }> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = readImportFields(row, headerIndex);
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
    .map((row) => normalizePointCode(row.values.lockerCode ?? ''))
    .filter(Boolean);
  const { lockers } = createRepositories();
  const lockerByCode = await lockers.findByCodes(pointCodes);

  const rows: ParcelImportPreviewRow[] = parsedRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const pickupType = parsePickupType(values.pickupType ?? '');
    if (!pickupType) errors.push('Méthode invalide');

    const packageSize = parseSize(values.packageSize ?? '');
    if (!packageSize) errors.push('Taille colis invalide');

    const packageCategory = parseCategory(values.category ?? '');
    if (!packageCategory) errors.push('Catégorie invalide');

    const paymentRaw = values.payment.trim();
    const paymentResponsibility = paymentRaw ? parsePayment(paymentRaw) : 'receiver_pays';
    if (paymentRaw && !paymentResponsibility) {
      errors.push('Mode de paiement invalide (colonne héritée)');
    }

    const pointCode = normalizePointCode(values.lockerCode ?? '');
    const locker: LockerLookup | undefined = pointCode ? lockerByCode.get(pointCode) : undefined;
    if (!pointCode) {
      errors.push('Code casier requis');
    } else if (!locker) {
      errors.push(`Code casier inconnu : ${pointCode}`);
    } else if (locker.status !== 'active') {
      errors.push(`Casier inactif : ${pointCode}`);
    } else if (locker.type !== 'SMART_LOCKER') {
      errors.push(`Seuls les casiers Eveider sont acceptés : ${pointCode}`);
    }

    if (paymentResponsibility === 'cod') {
      errors.push('Le paiement à la livraison n’est plus proposé (colonne héritée)');
    }

    const packageWeightKg = cellToNumber(values.weight);
    const codAmountCdf = cellToNumber(values.codCdf);
    const codAmountUsd = cellToNumber(values.codUsd);

    const candidate = {
      reference: values.reference || undefined,
      pickupType: pickupType ?? 'courier_pickup',
      senderName: values.senderName,
      senderPhone: values.senderPhone,
      senderAddress: values.senderAddress || undefined,
      recipientName: values.recipientName,
      recipientPhone: values.recipientPhone,
      recipientEmail: values.recipientEmail || undefined,
      lockerId: locker?.id ?? '00000000-0000-0000-0000-000000000000',
      packageSize: packageSize ?? 'medium',
      packageWeightKg,
      packageCategory: packageCategory ?? 'other',
      paymentResponsibility: paymentResponsibility ?? 'receiver_pays',
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
