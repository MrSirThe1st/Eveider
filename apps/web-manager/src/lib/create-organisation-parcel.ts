import type { CreateParcelInput } from '@eveider/api-contracts';
import { createRepositories, type DataAccessContext } from '@eveider/data-access';
import { buildDeliveryQuote } from '@/lib/delivery-quote';
import { toParcelDto, type ParcelDto } from '@/lib/business-parcel-presenter';
import { resolveAvailableCompartmentId } from '@/lib/resolve-compartment';

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
    lockerId: data.lockerId,
    pickupType: data.pickupType,
  });

  const compartmentId =
    data.compartmentId ?? (await resolveAvailableCompartmentId(data.lockerId, data.packageSize));

  // Web, Excel/import, and organisation API all use this helper.
  // Canonical charge snapshot happens inside parcels.create's transaction.
  const { parcels } = createRepositories();
  const result = await parcels.create(ctx, {
    businessId,
    reference: data.reference,
    pickupType: data.pickupType,
    senderName: data.senderName,
    senderPhone: data.senderPhone,
    senderAddress: data.senderAddress,
    pickupLocationId: data.pickupLocationId,
    senderLocationName: data.senderLocationName,
    senderLat: data.senderLat,
    senderLng: data.senderLng,
    senderInstructions: data.senderInstructions,
    recipientPhone: data.recipientPhone,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    lockerId: data.lockerId,
    compartmentId,
    packageSize: data.packageSize,
    packageLengthCm: data.packageLengthCm,
    packageWidthCm: data.packageWidthCm,
    packageHeightCm: data.packageHeightCm,
    packageWeightKg: data.packageWeightKg,
    packageCategory: data.packageCategory,
    declaredValueCdf: data.declaredValueCdf,
    declaredValueUsd: data.declaredValueUsd,
    paymentResponsibility: data.paymentResponsibility ?? 'receiver_pays',
    codAmountCdf: data.codAmountCdf,
    codAmountUsd: data.codAmountUsd,
    deliveryFeeAmount: quote.deliveryFeeAmount,
    deliveryFeeCurrency: quote.deliveryFeeCurrency,
    deliveryDistanceKm: null,
    pricingSizeUsed: null,
  });

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
    message.includes('Aucun compartiment compatible') ||
    message.includes('Adresse expéditeur') ||
    message.includes('Montant COD')
  ) {
    return { status: 400, message };
  }
  if (
    message.includes('indisponible') ||
    message.includes('introuvable') ||
    message.includes('Zone tarifaire') ||
    message.includes('CANONICAL') ||
    message.includes('ZONE_PRICING_NOT_CONFIGURED')
  ) {
    return { status: 409, message };
  }
  return { status: 500, message };
}
