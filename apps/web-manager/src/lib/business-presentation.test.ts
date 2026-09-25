import { describe, expect, it } from 'vitest';
import {
  getBusinessAttentionLabel,
  getBusinessBillingChargeStatusLabel,
  getBusinessBillingHistoryDescription,
  getBusinessChargeLabel,
  getBusinessDeliveryKindLabel,
  getBusinessParcelDisplayStatus,
  getFulfillmentMethodLabel,
  isBusinessOwedCharge,
  matchesBusinessAttention,
} from './business-presentation';

describe('business parcel presentation', () => {
  it('labels Flow 1 created as awaiting pickup, never transport', () => {
    expect(
      getBusinessParcelDisplayStatus({ status: 'created', pickupType: 'courier_pickup' }),
    ).toBe('En attente de prise en charge');
    expect(
      getBusinessParcelDisplayStatus({ status: 'created', pickupType: 'merchant_dropoff' }),
    ).toBe('En attente de dépôt');
    expect(
      getBusinessParcelDisplayStatus({ status: 'created', pickupType: 'merchant_dropoff' }),
    ).not.toContain('transport');
  });

  it('keeps AT_POINT distinct from READY', () => {
    expect(getBusinessParcelDisplayStatus({ status: 'delivered_to_locker' })).toBe('Au casier');
    expect(getBusinessParcelDisplayStatus({ status: 'ready_for_pickup' })).toBe('Prêt au retrait');
  });

  it('labels methods without Point terminology', () => {
    expect(getFulfillmentMethodLabel('courier_pickup')).toBe('Collecte Eveider');
    expect(getFulfillmentMethodLabel('merchant_dropoff')).toBe('Dépôt au casier');
  });
});

describe('business charges', () => {
  it('treats only return and storage as Business debt', () => {
    expect(isBusinessOwedCharge('return_delivery', 'business')).toBe(true);
    expect(isBusinessOwedCharge('return_locker', 'business')).toBe(true);
    expect(isBusinessOwedCharge('locker_rental', 'business')).toBe(true);
    expect(isBusinessOwedCharge('outbound_delivery', 'recipient')).toBe(false);
    expect(isBusinessOwedCharge('locker_collection', 'recipient')).toBe(false);
    expect(getBusinessChargeLabel('return_locker')).toBe('Retrait du retour par l’entreprise');
    expect(getBusinessChargeLabel('locker_collection')).toBe('Retrait au casier');
    expect(getBusinessChargeLabel('locker_rental')).toBe('Stockage');
  });

  it('formats Facturation history descriptions and statuses', () => {
    expect(getBusinessBillingHistoryDescription('return_delivery')).toBe(
      'Retour transporté par Eveider',
    );
    expect(getBusinessBillingHistoryDescription('return_locker')).toBe('Retrait d’un retour');
    expect(getBusinessBillingHistoryDescription('locker_rental', 1)).toBe(
      'Stockage supplémentaire — 24 h',
    );
    expect(getBusinessBillingHistoryDescription('locker_rental', 2)).toBe(
      'Stockage supplémentaire — 48 h',
    );
    expect(getBusinessBillingHistoryDescription('locker_rental', null)).toBe(
      'Stockage supplémentaire',
    );
    expect(getBusinessBillingChargeStatusLabel('owed')).toBe('À payer');
    expect(getBusinessBillingChargeStatusLabel('pending')).toBe('En cours');
    expect(getBusinessBillingChargeStatusLabel('void')).toBe('Annulé');
  });
});

describe('business attention', () => {
  it('never classifies Flow 2 created as in transport', () => {
    expect(
      matchesBusinessAttention(
        { status: 'created', pickupType: 'merchant_dropoff' },
        'in_transit',
      ),
    ).toBe(false);
    expect(
      matchesBusinessAttention(
        { status: 'in_transit', pickupType: 'courier_pickup' },
        'in_transit',
      ),
    ).toBe(true);
    expect(
      getBusinessAttentionLabel({ status: 'created', pickupType: 'merchant_dropoff' }),
    ).toBe('À déposer au casier');
  });

  it('labels historical RTS separately from customer returns', () => {
    expect(getBusinessDeliveryKindLabel('return')).toBe('Retour non retiré (historique)');
    expect(getBusinessDeliveryKindLabel('customer_return')).toBe('Retour Eveider');
    expect(getBusinessDeliveryKindLabel('outbound')).toBe('Transport Eveider');
  });
});
