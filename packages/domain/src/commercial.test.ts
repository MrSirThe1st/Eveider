import { describe, expect, it } from 'vitest';
import {
  canAuthorizeRecipientCollection,
  collectionAuthorizationErrorMessage,
  evaluateRecipientCollection,
  isRecipientCollectionCommerciallyAuthorized,
  outboundChargeKind,
  outboundCommercialCase,
  payerForChargeKind,
  recipientFeeOutstanding,
  resolveCommercialPricingModel,
  returnChargeKind,
  returnCommercialCase,
} from './commercial.js';

describe('commercial cases', () => {
  it('maps Flow 1/2 from pickup type', () => {
    expect(outboundCommercialCase('courier_pickup')).toBe('flow1_eveider_delivery');
    expect(outboundChargeKind('courier_pickup')).toBe('outbound_delivery');
    expect(payerForChargeKind('outbound_delivery')).toBe('recipient');

    expect(outboundCommercialCase('merchant_dropoff')).toBe('flow2_business_dropoff');
    expect(outboundChargeKind('merchant_dropoff')).toBe('locker_collection');
    expect(payerForChargeKind('locker_collection')).toBe('recipient');
  });

  it('maps Flow 3A/3B from return method', () => {
    expect(returnCommercialCase('eveider_return')).toBe('flow3a_eveider_return');
    expect(returnChargeKind('eveider_return')).toBe('return_delivery');
    expect(payerForChargeKind('return_delivery')).toBe('business');

    expect(returnCommercialCase('business_pickup')).toBe('flow3b_business_pickup');
    expect(returnChargeKind('business_pickup')).toBe('return_locker');
    expect(payerForChargeKind('return_locker')).toBe('business');
  });

  it('keeps storage as a business charge', () => {
    expect(payerForChargeKind('locker_rental')).toBe('business');
  });

  it('keeps historical delivery_fee and drop_off_fee as business-readable kinds', () => {
    expect(payerForChargeKind('delivery_fee')).toBe('business');
    expect(payerForChargeKind('drop_off_fee')).toBe('business');
  });
});

describe('commercial model distinction', () => {
  it('treats a live recipient service charge as canonical', () => {
    expect(
      resolveCommercialPricingModel({
        commercialModel: 'legacy',
        hasRecipientServiceCharge: true,
      }),
    ).toBe('canonical');
  });

  it('treats commercial_model=canonical without a charge as canonical (fail closed)', () => {
    expect(
      resolveCommercialPricingModel({
        commercialModel: 'canonical',
        hasRecipientServiceCharge: false,
      }),
    ).toBe('canonical');
  });

  it('treats unmarked parcels without a recipient charge as legacy', () => {
    expect(
      resolveCommercialPricingModel({
        commercialModel: 'legacy',
        hasRecipientServiceCharge: false,
      }),
    ).toBe('legacy');
  });
});

describe('recipient collection authorization', () => {
  it('allows READY_FOR_PICKUP while unpaid — payment only blocks collection', () => {
    expect(
      canAuthorizeRecipientCollection({
        parcelStatus: 'ready_for_pickup',
        recipientFeeOutstanding: true,
      }),
    ).toBe(false);
    expect(
      canAuthorizeRecipientCollection({
        parcelStatus: 'ready_for_pickup',
        recipientFeeOutstanding: false,
      }),
    ).toBe(true);
  });

  it('never authorizes collection before READY_FOR_PICKUP', () => {
    expect(
      canAuthorizeRecipientCollection({
        parcelStatus: 'delivered_to_locker',
        recipientFeeOutstanding: false,
      }),
    ).toBe(false);
  });

  it('does not treat a zero amount as outstanding', () => {
    expect(
      recipientFeeOutstanding({
        amount: 0,
        paymentCompleted: false,
      }),
    ).toBe(false);
  });

  it('keeps an unpaid canonical amount outstanding regardless of provider availability', () => {
    expect(
      recipientFeeOutstanding({
        amount: 1500,
        paymentCompleted: false,
      }),
    ).toBe(true);
  });
});

describe('evaluateRecipientCollection', () => {
  it('blocks Flow 1 READY + unpaid and hides the PIN', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: 5000,
      paymentCompleted: false,
    });
    expect(decision).toMatchObject({
      authorized: false,
      pinAuthorized: false,
      outstanding: true,
      code: 'PAYMENT_OUTSTANDING',
    });
    expect(isRecipientCollectionCommerciallyAuthorized(decision)).toBe(false);
  });

  it('allows READY + paid', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: 5000,
      paymentCompleted: true,
    });
    expect(decision.authorized).toBe(true);
    expect(decision.pinAuthorized).toBe(true);
  });

  it('allows READY + zero canonical amount without a payment record', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: 0,
      paymentCompleted: false,
    });
    expect(decision.authorized).toBe(true);
    expect(decision.pinAuthorized).toBe(true);
    expect(decision.outstanding).toBe(false);
  });

  it('fails closed when a canonical parcel is missing its recipient charge', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: null,
      paymentCompleted: false,
    });
    expect(decision.code).toBe('CANONICAL_CHARGE_MISSING');
    expect(decision.authorized).toBe(false);
    expect(decision.pinAuthorized).toBe(false);
    expect(collectionAuthorizationErrorMessage(decision)).toContain('CANONICAL_CHARGE_MISSING');
  });

  it('does not treat missing charge as free for canonical parcels', () => {
    const unpaid = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: 1500,
      paymentCompleted: false,
    });
    const missing = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'canonical',
      recipientChargeAmount: null,
      paymentCompleted: false,
    });
    expect(unpaid.authorized).toBe(false);
    expect(missing.authorized).toBe(false);
    expect(missing.code).not.toBe('AUTHORIZED');
  });

  it('keeps authorization independent of payment-provider configuration', () => {
    const withSameChargeAndPayment = {
      parcelStatus: 'ready_for_pickup' as const,
      model: 'canonical' as const,
      recipientChargeAmount: 1500,
      paymentCompleted: false,
    };
    expect(evaluateRecipientCollection(withSameChargeAndPayment).authorized).toBe(false);
    expect(evaluateRecipientCollection(withSameChargeAndPayment).pinAuthorized).toBe(false);
  });

  it('preserves legacy unpaid pickup-fee blocking when the legacy fee is required', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'legacy',
      recipientChargeAmount: null,
      paymentCompleted: false,
      legacyFeeRequired: true,
    });
    expect(decision.code).toBe('PAYMENT_OUTSTANDING');
    expect(decision.pinAuthorized).toBe(false);
  });

  it('allows legacy collection when no historical pickup fee is required', () => {
    const decision = evaluateRecipientCollection({
      parcelStatus: 'ready_for_pickup',
      model: 'legacy',
      recipientChargeAmount: null,
      paymentCompleted: false,
      legacyFeeRequired: false,
    });
    expect(decision.authorized).toBe(true);
    expect(decision.pinAuthorized).toBe(true);
  });
});
