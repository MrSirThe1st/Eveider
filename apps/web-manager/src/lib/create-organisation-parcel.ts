import type { CreateParcelInput } from '@eveider/api-contracts';
import { createRepositories, type DataAccessContext, withTransaction } from '@eveider/data-access';
import { buildDeliveryQuote } from '@/lib/delivery-quote';
import { toParcelDto, type ParcelDto } from '@/lib/business-parcel-presenter';

export type CreatedOrganisationParcel = {
  parcel: ParcelDto;
  recipientStatus: string;
  invite: unknown;
};

export async function createOrganisationParcel(
  ctx: DataAccessContext,
  businessId: string,
  data: CreateParcelInput,
): Promise<CreatedOrganisationParcel> {
  const quote = await buildDeliveryQuote({
    businessId,
    lockerId: data.lockerId,
    compartmentId: data.compartmentId,
    packageSize: data.packageSize,
    senderAddress: data.senderAddress,
    pickupType: data.pickupType,
  });

  const isMerchantDropoff = data.pickupType === 'merchant_dropoff';
  const { parcels, parcelCharges } = createRepositories();
  const result = await parcels.create(ctx, {
    businessId,
    reference: data.reference,
    pickupType: data.pickupType,
    senderName: data.senderName,
    senderPhone: data.senderPhone,
    senderAddress: data.senderAddress,
    recipientPhone: data.recipientPhone,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    lockerId: data.lockerId,
    compartmentId: data.compartmentId,
    packageSize: data.packageSize,
    packageLengthCm: data.packageLengthCm,
    packageWidthCm: data.packageWidthCm,
    packageHeightCm: data.packageHeightCm,
    packageWeightKg: data.packageWeightKg,
    packageCategory: data.packageCategory,
    declaredValueCdf: data.declaredValueCdf,
    declaredValueUsd: data.declaredValueUsd,
    paymentResponsibility: data.paymentResponsibility,
    codAmountCdf: data.codAmountCdf,
    codAmountUsd: data.codAmountUsd,
    // Drop-off fee is locked on deposit, not at create.
    deliveryFeeAmount: isMerchantDropoff ? null : quote.deliveryFeeAmount,
    deliveryFeeCurrency: quote.deliveryFeeCurrency,
    deliveryDistanceKm: isMerchantDropoff ? null : quote.deliveryDistanceKm,
    pricingSizeUsed: isMerchantDropoff ? null : quote.pricingSizeUsed,
  });

  if (!isMerchantDropoff && quote.deliveryFeeAmount != null) {
    await withTransaction(async (tx) => {
      await parcelCharges.recordDeliveryFee(tx, {
        parcelId: result.parcel.id,
        businessId,
        amount: quote.deliveryFeeAmount,
        currency: quote.deliveryFeeCurrency,
      });
    });
  }

  return {
    parcel: toParcelDto(result.parcel),
    recipientStatus: result.recipientStatus,
    invite: result.invite ?? null,
  };
}

export function organisationParcelCreateStatus(err: unknown): { status: number; message: string } {
  if (typeof err === 'object' && err && 'code' in err && (err.code === 'P2002' || err.code === '23505')) {
    return { status: 409, message: 'Cette référence existe déjà' };
  }
  const message = err instanceof Error ? err.message : 'Erreur serveur';
  if (message.includes('cannot submit parcels')) {
    return {
      status: 403,
      message:
        "Votre compte n'est pas encore activé. Vous pourrez envoyer des colis dès qu'Eveider l'aura accepté.",
    };
  }
  if (
    message.includes('COD') ||
    message.includes('Compartiment requis') ||
    message.includes('Adresse expéditeur') ||
    message.includes('Montant COD')
  ) {
    return { status: 400, message };
  }
  if (message.includes('indisponible') || message.includes('introuvable')) {
    return { status: 409, message };
  }
  return { status: 500, message };
}
