import type { DataAccessContext } from '@eveider/data-access';
import type { CreateParcelInput } from '@eveider/api-contracts';
import { createOrganisationParcel } from '@/lib/create-organisation-parcel';

export type ParcelImportCreateResult = {
  rowNumber: number;
  success: boolean;
  trackingNumber?: string;
  error?: string;
};

export async function createParcelsFromImport(
  ctx: DataAccessContext,
  businessId: string,
  rows: Array<{ rowNumber: number; data: CreateParcelInput }>,
): Promise<ParcelImportCreateResult[]> {
  const results: ParcelImportCreateResult[] = [];

  for (const row of rows) {
    try {
      const created = await createOrganisationParcel(ctx, businessId, row.data);
      results.push({
        rowNumber: row.rowNumber,
        success: true,
        trackingNumber: created.parcel.trackingNumber,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      results.push({ rowNumber: row.rowNumber, success: false, error: message });
    }
  }

  return results;
}
