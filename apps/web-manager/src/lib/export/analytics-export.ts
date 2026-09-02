import type { AnalyticsReport } from '@/components/admin-dashboard-types';
import { ISSUE_TYPE_LABELS, PARCEL_STATUS_LABELS } from '@eveider/domain';
import ExcelJS from 'exceljs';
import { appendRows, formatExportDay, styleHeaderRow } from '@/lib/export/xlsx-utils';

export async function buildAnalyticsExportWorkbook(analytics: AnalyticsReport, days: number) {
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet('Résumé');
  summary.addRow(['Indicateur', 'Valeur']);
  styleHeaderRow(summary, 2);
  appendRows(summary, [
    ['Période (jours)', days],
    ['Taux retrait réussi (%)', analytics.pickupSuccessRate],
    ['Taux usage casiers (%)', analytics.lockerUsageRate],
    ['Colis retirés', analytics.collected],
    ['En attente de retrait', analytics.awaitingPickup],
  ]);

  const deliveriesSheet = workbook.addWorksheet('Livraisons par jour');
  deliveriesSheet.addRow(['Date', 'Livraisons terminées']);
  styleHeaderRow(deliveriesSheet, 2);
  appendRows(
    deliveriesSheet,
    analytics.dailyDeliveries.map((entry) => [formatExportDay(entry.date), entry.count]),
  );

  const parcelsSheet = workbook.addWorksheet('Colis créés');
  parcelsSheet.addRow(['Date', 'Colis créés']);
  styleHeaderRow(parcelsSheet, 2);
  appendRows(
    parcelsSheet,
    analytics.dailyParcelsCreated.map((entry) => [formatExportDay(entry.date), entry.count]),
  );

  const statusSheet = workbook.addWorksheet('Colis par statut');
  statusSheet.addRow(['Statut', 'Nombre']);
  styleHeaderRow(statusSheet, 2);
  appendRows(
    statusSheet,
    analytics.parcelsByStatus.map((entry) => [
      PARCEL_STATUS_LABELS[entry.status],
      entry.count,
    ]),
  );

  const issuesSheet = workbook.addWorksheet('Incidents ouverts');
  issuesSheet.addRow(['Type', 'Nombre']);
  styleHeaderRow(issuesSheet, 2);
  appendRows(
    issuesSheet,
    analytics.openIssuesByType.map((entry) => [ISSUE_TYPE_LABELS[entry.type], entry.count]),
  );

  const lockersSheet = workbook.addWorksheet('Top points');
  lockersSheet.addRow(['Point', 'Colis']);
  styleHeaderRow(lockersSheet, 2);
  appendRows(
    lockersSheet,
    analytics.topLockers.map((entry) => [entry.lockerName, entry.parcelCount]),
  );

  const businessesSheet = workbook.addWorksheet('Top organisations');
  businessesSheet.addRow(['Organisation', 'Colis']);
  styleHeaderRow(businessesSheet, 2);
  appendRows(
    businessesSheet,
    analytics.topBusinesses.map((entry) => [entry.businessName, entry.parcelCount]),
  );

  return workbook;
}
