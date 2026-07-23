import { describe, expect, it } from 'vitest';
import { toCustomerParcelDto } from './customer-parcel-presenter';

const baseParcel = {
  id: 'parcel-1',
  trackingNumber: 'EVD26A7K3M2PX',
  reference: 'PK-001',
  status: 'ready_for_pickup' as const,
  recipientName: 'Marc',
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
});
