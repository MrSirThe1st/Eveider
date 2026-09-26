import type { CreateParcelInput } from '@eveider/api-contracts';
import { createRepositories, type DataAccessContext } from '@eveider/data-access';
import { buildDeliveryQuote } from '@/lib/delivery-quote';
import { toParcelDto, type ParcelDto } from '@/lib/business-parcel-presenter';
import { resolveAvailableCompartmentId } from '@/lib/resolve-compartment';

export { organisationParcelCreateStatus } from '@/lib/organisation-parcel-create-status';

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
    driverInstructions: data.driverInstructions,
    dueAt: data.dueAt ?? null,
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
