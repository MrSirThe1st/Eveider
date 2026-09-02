import type ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

export async function xlsxResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function formatExportDate(iso: string | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatExportDay(iso: string): string {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function stampFilename(prefix: string): string {
  const stamp = new Intl.DateTimeFormat('fr-CD', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\//g, '-');
  return `${prefix}-${stamp}.xlsx`;
}

export function styleHeaderRow(sheet: ExcelJS.Worksheet, columnCount: number) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', wrapText: true };
  for (let column = 1; column <= columnCount; column += 1) {
    sheet.getColumn(column).width = 18;
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function appendRows(sheet: ExcelJS.Worksheet, rows: Array<Array<string | number | null>>) {
  for (const row of rows) {
    sheet.addRow(row.map((value) => (value == null ? '' : value)));
  }
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('text' in value && value.text != null) return String(value.text).trim();
    if ('result' in value && value.result != null) return String(value.result).trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? '').join('').trim();
    }
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

export function cellToNumber(value: ExcelJS.CellValue): number | undefined {
  const raw = cellToString(value);
  if (!raw) return undefined;
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
