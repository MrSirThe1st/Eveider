import { describe, expect, it } from 'vitest';
import { getAdminParcelDisplayStatus } from './admin-presentation';
import { getBusinessChargeLabel, getBusinessParcelDisplayStatus, isBusinessOwedCharge } from './business-presentation';
import { getPublicJourney, getPublicParcelStatus } from './public-parcel-presentation';

describe('cross-role Flow 1', () => {
  it('shares the same underlying transport states with role-specific wording', () => {
    expect(
      getAdminParcelDisplayStatus({ status: 'created', pickupType: 'courier_pickup' }),
    ).toBe('En attente de prise en charge');
    expect(
      getBusinessParcelDisplayStatus({ status: 'created', pickupType: 'courier_pickup' }),
    ).toBe('En attente de prise en charge');
    expect(getPublicParcelStatus({ status: 'created', pickupType: 'courier_pickup' })).toBe(
      'Colis préparé',
    );

    expect(getAdminParcelDisplayStatus({ status: 'in_transit' })).toBe('En cours de transport');
    expect(getBusinessParcelDisplayStatus({ status: 'in_transit' })).toBe('En cours de transport');
    expect(getPublicParcelStatus({ status: 'in_transit', pickupType: 'courier_pickup' })).toBe(
      'En cours de transport',
    );
  });
});

describe('cross-role Flow 2', () => {
  it('never shows transport for a merchant drop-off parcel', () => {
    const created = { status: 'created' as const, pickupType: 'merchant_dropoff' as const };
    expect(getAdminParcelDisplayStatus(created)).toBe('En attente de dépôt');
    expect(getBusinessParcelDisplayStatus(created)).toBe('En attente de dépôt');
    expect(getPublicParcelStatus(created)).toBe('Colis préparé');
    expect(getAdminParcelDisplayStatus(created)).not.toMatch(/transport|chauffeur/i);
    expect(getPublicJourney({ ...created, customerReturn: null }).steps.some((step) =>
      /transport|chauffeur/i.test(step.label),
    )).toBe(false);
  });
});

describe('cross-role Flow 3A vs 3B', () => {
  it('keeps Eveider return transport only on 3A', () => {
    expect(getAdminParcelDisplayStatus({ status: 'returning' })).toBe('Retour en transport');
    const threeB = getPublicJourney({
      status: 'return_at_point',
      pickupType: 'courier_pickup',
      customerReturn: { status: 'awaiting_pickup', method: 'business_pickup' },
    });
    expect(threeB.steps.some((step) => /transport/i.test(step.label))).toBe(false);
    const threeA = getPublicJourney({
      status: 'returning',
      pickupType: 'courier_pickup',
      customerReturn: { status: 'in_transit', method: 'eveider_return' },
    });
    expect(threeA.steps.map((step) => step.label)).toContain('Retour en cours');
  });
});

describe('cross-role charges', () => {
  it('counts only return and storage as Business debt', () => {
    expect(isBusinessOwedCharge('outbound_delivery', 'recipient')).toBe(false);
    expect(isBusinessOwedCharge('locker_collection', 'recipient')).toBe(false);
    expect(isBusinessOwedCharge('return_delivery', 'business')).toBe(true);
    expect(isBusinessOwedCharge('return_locker', 'business')).toBe(true);
    expect(isBusinessOwedCharge('locker_rental', 'business')).toBe(true);
    expect(getBusinessChargeLabel('return_locker')).toBe('Retrait du retour par l’entreprise');
    expect(getBusinessChargeLabel('locker_collection')).toBe('Retrait au casier');
  });
});

describe('AT_POINT vs READY', () => {
  it('keeps delivered_to_locker distinct from ready_for_pickup on every surface', () => {
    expect(getAdminParcelDisplayStatus({ status: 'delivered_to_locker' })).toBe('Au casier');
    expect(getBusinessParcelDisplayStatus({ status: 'delivered_to_locker' })).toBe('Au casier');
    expect(getAdminParcelDisplayStatus({ status: 'ready_for_pickup' })).toBe('Prêt au retrait');
    expect(getPublicParcelStatus({ status: 'delivered_to_locker', pickupType: 'courier_pickup' })).toBe(
      'Arrivé au casier',
    );
    expect(getPublicParcelStatus({ status: 'ready_for_pickup' })).toBe('Prêt au retrait');
  });
});
