import { describe, expect, it } from 'vitest';
import {
  getAdminDeliveryKindLabel,
  getAdminDeliveryStatusLabel,
  getAdminParcelDisplayStatus,
  getAdminReturnMethodLabel,
  getAdminReturnProcessLabel,
  getFulfillmentMethodLabel,
  isEveiderOutboundTransport,
  isLegacyLockerType,
  summarizeAdminParcelEvent,
} from './admin-presentation';

describe('getFulfillmentMethodLabel', () => {
  it('labels Flow 1 as Collecte Eveider', () => {
    expect(getFulfillmentMethodLabel('courier_pickup')).toBe('Collecte Eveider');
  });

  it('labels Flow 2 as Dépôt au casier', () => {
    expect(getFulfillmentMethodLabel('merchant_dropoff')).toBe('Dépôt au casier');
  });
});

describe('getAdminParcelDisplayStatus', () => {
  it('shows Flow 1 created as awaiting pickup, never in transport', () => {
    expect(
      getAdminParcelDisplayStatus({ status: 'created', pickupType: 'courier_pickup' }),
    ).toBe('En attente de prise en charge');
    expect(
      getAdminParcelDisplayStatus({
        status: 'created',
        pickupType: 'courier_pickup',
        hasAssignedOutboundDelivery: true,
      }),
    ).toBe('Chauffeur assigné');
  });

  it('shows Flow 2 created as awaiting deposit, never as transport', () => {
    expect(
      getAdminParcelDisplayStatus({ status: 'created', pickupType: 'merchant_dropoff' }),
    ).toBe('En attente de dépôt');
    expect(
      getAdminParcelDisplayStatus({ status: 'created', pickupType: 'merchant_dropoff' }),
    ).not.toContain('transport');
  });

  it('maps physical locker and pickup states', () => {
    expect(getAdminParcelDisplayStatus({ status: 'delivered_to_locker' })).toBe('Au casier');
    expect(getAdminParcelDisplayStatus({ status: 'ready_for_pickup' })).toBe('Prêt au retrait');
    expect(getAdminParcelDisplayStatus({ status: 'in_transit' })).toBe('En cours de transport');
    expect(getAdminParcelDisplayStatus({ status: 'collected' })).toBe('Retiré');
  });

  it('maps customer-return physical states', () => {
    expect(getAdminParcelDisplayStatus({ status: 'return_at_point' })).toBe('Retour au casier');
    expect(getAdminParcelDisplayStatus({ status: 'returning' })).toBe('Retour en transport');
    expect(getAdminParcelDisplayStatus({ status: 'returned' })).toBe('Retourné');
  });
});

describe('getAdminDeliveryStatusLabel', () => {
  it('uses transportation vocabulary rather than parcel states', () => {
    expect(getAdminDeliveryStatusLabel('assigned')).toBe('Assignée');
    expect(getAdminDeliveryStatusLabel('scanned')).toBe('Prise en charge');
    expect(getAdminDeliveryStatusLabel('drop_off_pending')).toBe('Dépôt en cours');
    expect(getAdminDeliveryStatusLabel('completed')).toBe('Terminée');
    expect(getAdminDeliveryStatusLabel('failed')).toBe('Échouée');
  });
});

describe('getAdminDeliveryKindLabel', () => {
  it('labels Flow 1 as Aller and Flow 3A as Retour client', () => {
    expect(getAdminDeliveryKindLabel('outbound')).toBe('Aller');
    expect(getAdminDeliveryKindLabel('customer_return')).toBe('Retour client');
  });

  it('keeps historical RTS readable without calling it a customer return', () => {
    expect(getAdminDeliveryKindLabel('return')).toBe('Retour non retiré (historique)');
    expect(getAdminDeliveryKindLabel('return')).not.toBe('Retour client');
    expect(getAdminDeliveryKindLabel('return')).not.toContain('RTS');
  });
});

describe('customer return process vs physical state', () => {
  it('separates return business process from parcel physical state', () => {
    expect(getAdminReturnProcessLabel('requested')).toBe('Demandé');
    expect(getAdminReturnProcessLabel('authorized')).toBe('Autorisé');
    expect(getAdminReturnProcessLabel('rejected')).toBe('Refusé');
    expect(getAdminReturnProcessLabel('cancelled')).toBe('Annulé');
    expect(getAdminReturnMethodLabel('eveider_return')).toBe('Retour Eveider');
    expect(getAdminReturnMethodLabel('business_pickup')).toBe('Retrait par l’entreprise');
  });
});

describe('transport eligibility presentation', () => {
  it('treats only Collecte Eveider as outbound Eveider transport', () => {
    expect(isEveiderOutboundTransport('courier_pickup')).toBe(true);
    expect(isEveiderOutboundTransport('merchant_dropoff')).toBe(false);
  });
});

describe('legacy locker types', () => {
  it('marks partner/residential records as historical', () => {
    expect(isLegacyLockerType('SMART_LOCKER')).toBe(false);
    expect(isLegacyLockerType('PARTNER_POINT')).toBe(true);
    expect(isLegacyLockerType('RESIDENTIAL_LOCKER')).toBe(true);
  });
});

describe('summarizeAdminParcelEvent', () => {
  it('keeps hardware session ids off the operator timeline', () => {
    expect(
      summarizeAdminParcelEvent({
        sessionId: 'sess-1',
        lockerSessionId: 'ls-1',
        compartmentLabel: 'A1',
      }),
    ).toBe('Compartiment A1');
  });

  it('labels historical RTS events without RTS jargon', () => {
    expect(summarizeAdminParcelEvent({ kind: 'return' })).toBe(
      'Retour non retiré (historique)',
    );
  });
});
