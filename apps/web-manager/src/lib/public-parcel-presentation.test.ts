import { describe, expect, it } from 'vitest';
import {
  canShowPublicCollectionCode,
  getPublicJourney,
  getPublicParcelStatus,
  needsPublicPayment,
} from './public-parcel-presentation';

describe('public tracking Flow 1', () => {
  it('follows Colis préparé → transport → arrivé → prêt → retiré', () => {
    expect(getPublicParcelStatus({ status: 'created', pickupType: 'courier_pickup' })).toBe(
      'Colis préparé',
    );
    expect(getPublicParcelStatus({ status: 'in_transit', pickupType: 'courier_pickup' })).toBe(
      'En cours de transport',
    );
    expect(
      getPublicParcelStatus({ status: 'delivered_to_locker', pickupType: 'courier_pickup' }),
    ).toBe('Arrivé au casier');
    expect(getPublicParcelStatus({ status: 'ready_for_pickup', pickupType: 'courier_pickup' })).toBe(
      'Prêt au retrait',
    );
    const journey = getPublicJourney({
      status: 'created',
      pickupType: 'courier_pickup',
      customerReturn: null,
    });
    expect(journey.steps.map((step) => step.label)).toEqual([
      'Colis préparé',
      'En cours de transport',
      'Arrivé au casier',
      'Prêt au retrait',
      'Retiré',
    ]);
    expect(journey.steps.some((step) => /chauffeur|livraison/i.test(step.label))).toBe(false);
  });
});

describe('public tracking Flow 2', () => {
  it('never invents Eveider transportation', () => {
    const journey = getPublicJourney({
      status: 'created',
      pickupType: 'merchant_dropoff',
      customerReturn: null,
    });
    expect(journey.steps.map((step) => step.label)).toEqual([
      'Colis préparé',
      'Déposé au casier',
      'Prêt au retrait',
      'Retiré',
    ]);
    expect(journey.steps.some((step) => /transport|chauffeur/i.test(step.label))).toBe(false);
    expect(
      getPublicParcelStatus({ status: 'delivered_to_locker', pickupType: 'merchant_dropoff' }),
    ).toBe('Déposé au casier');
  });
});

describe('public tracking Flow 3B', () => {
  it('does not add a transport step', () => {
    const journey = getPublicJourney({
      status: 'return_at_point',
      pickupType: 'merchant_dropoff',
      customerReturn: { status: 'awaiting_pickup', method: 'business_pickup' },
    });
    expect(journey.steps.map((step) => step.label)).toEqual([
      'Retour demandé',
      'Retour autorisé',
      'Retour au casier',
      'Retourné à l’entreprise',
    ]);
    expect(journey.steps.some((step) => /transport/i.test(step.label))).toBe(false);
  });
});

describe('public PIN / payment gating', () => {
  it('hides payment and PIN at AT_POINT', () => {
    const parcel = {
      status: 'delivered_to_locker' as const,
      pickupType: 'courier_pickup' as const,
      pickupPin: '123456',
      pickupPayment: { required: true, status: 'none' },
      customerReturn: null,
    };
    expect(needsPublicPayment(parcel)).toBe(false);
    expect(canShowPublicCollectionCode(parcel)).toBe(false);
  });

  it('hides PIN when unpaid or charge missing', () => {
    expect(
      canShowPublicCollectionCode({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        pickupPin: '123456',
        pickupPayment: { required: true, status: 'none' },
        customerReturn: null,
      }),
    ).toBe(false);
    expect(
      canShowPublicCollectionCode({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        pickupPin: '123456',
        pickupPayment: { required: true, status: 'none', integrityError: 'CANONICAL_CHARGE_MISSING' },
        customerReturn: null,
      }),
    ).toBe(false);
  });

  it('shows PIN only when READY and authorized', () => {
    expect(
      canShowPublicCollectionCode({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        pickupPin: '123456',
        pickupPayment: { required: false, status: 'none' },
        customerReturn: null,
      }),
    ).toBe(true);
  });
});

describe('public historical RTS', () => {
  it('keeps legacy returned wording without customer-return controls', () => {
    expect(getPublicParcelStatus({ status: 'returned', pickupType: 'courier_pickup' })).toBe(
      'Retour à l’expéditeur',
    );
    expect(
      getPublicParcelStatus({
        status: 'returned',
        pickupType: 'courier_pickup',
        customerReturn: { status: 'completed', method: 'eveider_return' },
      }),
    ).toBe('Retourné à l’entreprise');
  });
});
