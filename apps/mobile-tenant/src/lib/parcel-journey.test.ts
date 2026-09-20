import { describe, expect, it } from 'vitest';
import type { CustomerParcel } from './api';
import { getParcelJourney } from './parcel-journey';

function parcel(partial: Partial<CustomerParcel>): CustomerParcel {
  return {
    id: 'parcel-1',
    trackingNumber: 'EVD26TEST0001A',
    reference: 'PK-001',
    status: 'created',
    statusLabel: 'CRÉÉ',
    recipientName: 'Marc',
    businessName: 'Boutique',
    pickupType: 'courier_pickup',
    locker: {
      id: 'locker-1',
      name: 'GOMBE',
      address: 'Ave 1',
      latitude: null,
      longitude: null,
    },
    compartmentLabel: 'A1',
    pickupPin: null,
    pickupPayment: null,
    deliveryStatus: null,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...partial,
  };
}

describe('getParcelJourney', () => {
  it('keeps AT_POINT distinct from ready for pickup', () => {
    const atPoint = getParcelJourney(
      parcel({ status: 'delivered_to_locker', deliveryStatus: 'completed' }),
    );
    const ready = getParcelJourney(
      parcel({ status: 'ready_for_pickup', deliveryStatus: 'completed' }),
    );

    expect(atPoint.lockerVisual).toBe('incoming');
    expect(atPoint.headline).toBe('Arrivé au casier');
    expect(atPoint.steps.find((step) => step.label === 'Prêt au retrait')?.done).toBe(false);

    expect(ready.lockerVisual).toBe('ready');
    expect(ready.headline).toBe('Prêt au retrait');
    expect(ready.steps.find((step) => step.label === 'Prêt au retrait')?.current).toBe(true);
  });

  it('does not treat business drop-off AT_POINT as Eveider transit', () => {
    const journey = getParcelJourney(
      parcel({
        status: 'delivered_to_locker',
        pickupType: 'merchant_dropoff',
        deliveryStatus: null,
      }),
    );

    expect(journey.steps.some((step) => step.label === 'En cours de transport')).toBe(false);
    expect(journey.headline).toBe('Déposé au casier');
    expect(journey.lockerVisual).toBe('incoming');
  });

  it('labels customer-return physical states from parcel + Return', () => {
    expect(
      getParcelJourney(
        parcel({
          status: 'collected',
          customerReturn: {
            id: 'return-1',
            status: 'requested',
            statusLabel: 'DEMANDÉ',
            method: null,
            methodLabel: null,
            returnLocker: null,
            returnCode: null,
            canCancel: true,
            canDeposit: false,
          },
        }),
      ).headline,
    ).toBe('Retour demandé');
    expect(getParcelJourney(parcel({ status: 'return_at_point' })).headline).toBe(
      'Retour déposé au casier',
    );
    expect(getParcelJourney(parcel({ status: 'returning' })).headline).toBe('Retour en cours');
    expect(getParcelJourney(parcel({ status: 'returned' })).headline).toBe('Retour à l’expéditeur');
  });
});
