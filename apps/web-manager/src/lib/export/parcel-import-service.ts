import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { CreateParcelInput } from '@eveider/api-contracts';
import { buildDeliveryQuote } from '@/lib/delivery-quote';

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
  const { parcels } = createRepositories();
  const results: ParcelImportCreateResult[] = [];

  for (const row of rows) {
    try {
      const quote = await buildDeliveryQuote({
        businessId,
        lockerId: row.data.lockerId,
        compartmentId: row.data.compartmentId,
        packageSize: row.data.packageSize,
        senderAddress: row.data.senderAddress,
      });

      const result = await parcels.create(ctx, {
        businessId,
        reference: row.data.reference,
        pickupType: row.data.pickupType,
        senderName: row.data.senderName,
        senderPhone: row.data.senderPhone,
        senderAddress: row.data.senderAddress,
        recipientPhone: row.data.recipientPhone,
        recipientName: row.data.recipientName,
        recipientEmail: row.data.recipientEmail,
        lockerId: row.data.lockerId,
        compartmentId: row.data.compartmentId,
        packageSize: row.data.packageSize,
        packageLengthCm: row.data.packageLengthCm,
        packageWidthCm: row.data.packageWidthCm,
        packageHeightCm: row.data.packageHeightCm,
        packageWeightKg: row.data.packageWeightKg,
        packageCategory: row.data.packageCategory,
        declaredValueCdf: row.data.declaredValueCdf,
        declaredValueUsd: row.data.declaredValueUsd,
        paymentResponsibility: row.data.paymentResponsibility,
        codAmountCdf: row.data.codAmountCdf,
        codAmountUsd: row.data.codAmountUsd,
        deliveryFeeFc: quote.deliveryFeeFc,
        deliveryDistanceKm: quote.deliveryDistanceKm,
        pricingSizeUsed: quote.pricingSizeUsed,
      });

      results.push({
        rowNumber: row.rowNumber,
        success: true,
        trackingNumber: result.parcel.trackingNumber,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      results.push({ rowNumber: row.rowNumber, success: false, error: message });
    }
  }

  return results;
}
