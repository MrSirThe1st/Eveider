import { describe, expect, it } from 'vitest';
import { toCustomerParcelDto } from './customer-parcel-presenter';

const baseParcel = {
  id: 'parcel-1',
  trackingNumber: 'EVD26A7K3M2PX',
  reference: 'PK-001',
  status: 'ready_for_pickup' as const,
  recipientName: 'Marc',
  pickupType: 'courier_pickup' as const,
  createdAt: new Date('2026-07-20T12:00:00Z'),
  updatedAt: new Date('2026-07-20T12:00:00Z'),
  business: { name: 'Boutique' },
  locker: {
    id: 'locker-1',
    name: 'GOMBE',
    address: 'Ave 1',
    latitude: null,
    longitude: null,
  },
  compartment: { label: 'A1' },
  pickupPin: { code: '482913' },
  deliveries: [{ status: 'completed' as const }],
};

describe('toCustomerParcelDto pickup gating', () => {
  it('hides PIN when payment is required but not completed', () => {
    const dto = toCustomerParcelDto(baseParcel, {
      pickupPayment: {
        required: true,
        status: 'none',
        amount: '5',
        currency: 'USD',
        provider: null,
        depositId: null,
        failureReason: null,
        kind: 'outbound_delivery',
        purpose: 'Livraison Eveider',
      },
      pickupPaid: false,
    });

    expect(dto.pickupPin).toBeNull();
    expect(dto.pickupPayment?.required).toBe(true);
  });

  it('reveals PIN after payment is completed', () => {
    const dto = toCustomerParcelDto(baseParcel, {
      pickupPayment: {
        required: true,
        status: 'completed',
        amount: '5',
        currency: 'USD',
        provider: 'ORANGE_COD',
        depositId: 'deposit-1',
        failureReason: null,
      },
      pickupPaid: true,
    });

    expect(dto.pickupPin).toBe('482913');
  });

  it('reveals PIN when payment is not configured', () => {
    const dto = toCustomerParcelDto(baseParcel, {
      pickupPayment: {
        required: false,
        status: 'none',
        amount: null,
        currency: null,
        provider: null,
        depositId: null,
        failureReason: null,
      },
      pickupPaid: true,
    });

    expect(dto.pickupPin).toBe('482913');
  });

  it('hides PIN when the canonical recipient charge is missing', () => {
    const dto = toCustomerParcelDto(baseParcel, {
      pickupPayment: {
        required: true,
        status: 'none',
        amount: null,
        currency: null,
        provider: null,
        depositId: null,
        failureReason: null,
        integrityError: 'CANONICAL_CHARGE_MISSING',
      },
      pickupPaid: false,
    });
    expect(dto.pickupPin).toBeNull();
  });

  it('hides PIN when unpaid even if the payment provider is unavailable', () => {
    const dto = toCustomerParcelDto(baseParcel, {
      pickupPayment: {
        required: true,
        status: 'none',
        amount: '1500',
        currency: 'CDF',
        provider: null,
        depositId: null,
        failureReason: null,
        paymentProviderAvailable: false,
      },
      pickupPaid: false,
    });
    expect(dto.pickupPin).toBeNull();
  });

  it('hides PIN until ready but still exposes fee preview earlier', () => {
    const dto = toCustomerParcelDto(
      { ...baseParcel, status: 'delivered_to_locker' },
      {
        pickupPayment: {
          required: true,
          status: 'none',
          amount: '4',
          currency: 'USD',
          provider: null,
          depositId: null,
          failureReason: null,
        },
        pickupPaid: true,
      },
    );

    expect(dto.pickupPin).toBeNull();
    expect(dto.pickupPayment?.amount).toBe('4');
    expect(dto.pickupPayment?.currency).toBe('USD');
    expect(dto.pickupType).toBe('courier_pickup');
  });

  it('allows a return request only on collected parcels without an active return', () => {
    expect(toCustomerParcelDto({ ...baseParcel, status: 'collected' }).canRequestReturn).toBe(true);
    expect(
      toCustomerParcelDto(
        { ...baseParcel, status: 'collected' },
        {
          customerReturn: {
            id: 'return-1',
            status: 'requested',
            statusLabel: 'DEMANDÉ',
            method: null,
            methodLabel: null,
            returnLocker: null,
            compartmentLabel: null,
            returnCode: null,
            requestedAt: '2026-07-20T12:00:00.000Z',
            authorizedAt: null,
            depositedAt: null,
            completedAt: null,
            canCancel: true,
            canDeposit: false,
            canApprove: true,
            canReject: true,
            canConfirmPickup: false,
            canAssignDriver: false,
          },
        },
      ).canRequestReturn,
    ).toBe(false);
  });
});
