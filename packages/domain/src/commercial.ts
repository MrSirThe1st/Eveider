import type { ParcelStatus } from './parcel.js';
import type { ParcelChargeKind } from './pricing.js';
import type { ShipmentPickupType } from './shipment.js';
import type { ParcelReturnMethod } from './parcel-return.js';

export type ChargePayer = 'recipient' | 'business';

export const CHARGE_PAYERS: readonly ChargePayer[] = ['recipient', 'business'] as const;

export const CANONICAL_CHARGE_KINDS = [
  'outbound_delivery',
  'locker_collection',
  'return_delivery',
  'return_locker',
  'locker_rental',
] as const;

export type CanonicalChargeKind = (typeof CANONICAL_CHARGE_KINDS)[number];

export const RECIPIENT_SERVICE_CHARGE_KINDS = ['outbound_delivery', 'locker_collection'] as const;
export type RecipientServiceChargeKind = (typeof RECIPIENT_SERVICE_CHARGE_KINDS)[number];

export const BUSINESS_SERVICE_CHARGE_KINDS = [
  'return_delivery',
  'return_locker',
  'locker_rental',
] as const;

export type OutboundCommercialCase = 'flow1_eveider_delivery' | 'flow2_business_dropoff';
export type ReturnCommercialCase = 'flow3a_eveider_return' | 'flow3b_business_pickup';

export type CommercialPricingModel = 'canonical' | 'legacy';

export const CANONICAL_CHARGE_MISSING = 'CANONICAL_CHARGE_MISSING';
export const PAYMENT_OUTSTANDING = 'PAYMENT_OUTSTANDING';
export const ZONE_PRICING_NOT_CONFIGURED = 'ZONE_PRICING_NOT_CONFIGURED';
export const ZONE_PRICING_NOT_CONFIGURED_MESSAGE =
  'ZONE_PRICING_NOT_CONFIGURED: tarif de zone non configuré';

export type RecipientCollectionCode =
  | 'NOT_READY'
  | 'AUTHORIZED'
  | 'PAYMENT_OUTSTANDING'
  | 'CANONICAL_CHARGE_MISSING';

export type RecipientCollectionDecision = {
  authorized: boolean;
  pinAuthorized: boolean;
  outstanding: boolean;
  code: RecipientCollectionCode;
  model: CommercialPricingModel;
};

export function outboundCommercialCase(pickupType: ShipmentPickupType): OutboundCommercialCase {
  return pickupType === 'merchant_dropoff' ? 'flow2_business_dropoff' : 'flow1_eveider_delivery';
}

export function returnCommercialCase(method: ParcelReturnMethod): ReturnCommercialCase {
  return method === 'eveider_return' ? 'flow3a_eveider_return' : 'flow3b_business_pickup';
}

export function outboundChargeKind(pickupType: ShipmentPickupType): RecipientServiceChargeKind {
  return pickupType === 'merchant_dropoff' ? 'locker_collection' : 'outbound_delivery';
}

export function returnChargeKind(method: ParcelReturnMethod): 'return_delivery' | 'return_locker' {
  return method === 'eveider_return' ? 'return_delivery' : 'return_locker';
}

export function payerForChargeKind(kind: ParcelChargeKind): ChargePayer {
  if (kind === 'outbound_delivery' || kind === 'locker_collection') return 'recipient';
  return 'business';
}

export function isRecipientServiceChargeKind(
  kind: ParcelChargeKind,
): kind is RecipientServiceChargeKind {
  return kind === 'outbound_delivery' || kind === 'locker_collection';
}

export function isBusinessServiceChargeKind(kind: ParcelChargeKind): boolean {
  return (
    kind === 'return_delivery' ||
    kind === 'return_locker' ||
    kind === 'locker_rental'
  );
}

/**
 * Canonical if a live recipient service charge exists, or the parcel was
 * created under the Phase 4+ commercial model. Otherwise historical/legacy.
 */
export function resolveCommercialPricingModel(input: {
  commercialModel: string | null | undefined;
  hasRecipientServiceCharge: boolean;
}): CommercialPricingModel {
  if (input.hasRecipientServiceCharge) return 'canonical';
  if (input.commercialModel === 'canonical') return 'canonical';
  return 'legacy';
}

/**
 * Payment obligation is independent of PawaPay availability.
 * Amount <= 0 is a genuinely free service.
 */
export function recipientFeeOutstanding(input: {
  amount: number;
  paymentCompleted: boolean;
}): boolean {
  if (input.amount <= 0) return false;
  return !input.paymentCompleted;
}

/**
 * Authoritative commercial decision for recipient collection / PIN.
 * PawaPay configuration is not an input.
 */
export function evaluateRecipientCollection(input: {
  parcelStatus: ParcelStatus;
  model: CommercialPricingModel;
  /** null = required canonical charge is missing */
  recipientChargeAmount: number | null;
  paymentCompleted: boolean;
  /** Legacy parcels only — historical pickup_fee + receiver_pays. */
  legacyFeeRequired?: boolean;
}): RecipientCollectionDecision {
  const model = input.model;

  if (model === 'canonical') {
    const missing = input.recipientChargeAmount == null;
    const outstanding = missing
      ? true
      : recipientFeeOutstanding({
          amount: input.recipientChargeAmount as number,
          paymentCompleted: input.paymentCompleted,
        });
    if (input.parcelStatus !== 'ready_for_pickup') {
      return {
        model,
        authorized: false,
        pinAuthorized: false,
        outstanding,
        code: 'NOT_READY',
      };
    }
    if (missing) {
      return {
        model,
        authorized: false,
        pinAuthorized: false,
        outstanding: true,
        code: 'CANONICAL_CHARGE_MISSING',
      };
    }
    if (outstanding) {
      return {
        model,
        authorized: false,
        pinAuthorized: false,
        outstanding: true,
        code: 'PAYMENT_OUTSTANDING',
      };
    }
    return {
      model,
      authorized: true,
      pinAuthorized: true,
      outstanding: false,
      code: 'AUTHORIZED',
    };
  }

  const outstanding = Boolean(input.legacyFeeRequired) && !input.paymentCompleted;
  if (input.parcelStatus !== 'ready_for_pickup') {
    return {
      model,
      authorized: false,
      pinAuthorized: false,
      outstanding,
      code: 'NOT_READY',
    };
  }
  if (outstanding) {
    return {
      model,
      authorized: false,
      pinAuthorized: false,
      outstanding: true,
      code: 'PAYMENT_OUTSTANDING',
    };
  }
  return {
    model,
    authorized: true,
    pinAuthorized: true,
    outstanding: false,
    code: 'AUTHORIZED',
  };
}

export function isRecipientCollectionCommerciallyAuthorized(
  decision: RecipientCollectionDecision,
): boolean {
  return decision.authorized;
}

export function collectionAuthorizationErrorMessage(
  decision: RecipientCollectionDecision,
): string {
  if (decision.code === 'CANONICAL_CHARGE_MISSING') {
    return 'CANONICAL_CHARGE_MISSING: frais destinataire introuvable';
  }
  if (decision.code === 'PAYMENT_OUTSTANDING') {
    return 'Paiement requis avant le retrait';
  }
  return 'Ce colis n’est pas prêt au retrait';
}

/**
 * READY_FOR_PICKUP may exist unpaid; payment only gates collection.
 * Prefer evaluateRecipientCollection for canonical Flow 1/2.
 */
export function canAuthorizeRecipientCollection(input: {
  parcelStatus: ParcelStatus;
  recipientFeeOutstanding: boolean;
}): boolean {
  if (input.parcelStatus !== 'ready_for_pickup') return false;
  return !input.recipientFeeOutstanding;
}
