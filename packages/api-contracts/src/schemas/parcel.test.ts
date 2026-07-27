import { describe, expect, it } from 'vitest';
import { createParcelSchema, listParcelsQuerySchema, updateParcelStatusSchema } from './parcel.js';

const baseShipment = {
  pickupType: 'merchant_dropoff' as const,
  senderName: 'Boutique Kin',
  senderPhone: '+243800000001',
  recipientName: 'Jean Mukendi',
  recipientPhone: '+243800000000',
  lockerId: '00000000-0000-4000-8000-000000000010',
  packageSize: 'medium' as const,
  packageCategory: 'fashion' as const,
  paymentResponsibility: 'receiver_pays' as const,
};

describe('createParcelSchema', () => {
  it('accepts a valid shipment', () => {
    const result = createParcelSchema.safeParse({
      ...baseShipment,
      reference: 'CMD-2026-001',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional status filter', () => {
    expect(listParcelsQuerySchema.safeParse({ status: 'created' }).success).toBe(true);
    expect(listParcelsQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid status update', () => {
    expect(updateParcelStatusSchema.safeParse({ status: 'in_transit' }).success).toBe(true);
  });

  it('requires sender address for courier pickup', () => {
    const result = createParcelSchema.safeParse({
      ...baseShipment,
      pickupType: 'courier_pickup',
    });
    expect(result.success).toBe(false);
  });

  it('accepts courier pickup with sender address', () => {
    const result = createParcelSchema.safeParse({
      ...baseShipment,
      pickupType: 'courier_pickup',
      senderAddress: 'Avenue du Commerce, Gombe',
    });
    expect(result.success).toBe(true);
  });

  it('requires COD amount when payment is COD', () => {
    const result = createParcelSchema.safeParse({
      ...baseShipment,
      paymentResponsibility: 'cod',
    });
    expect(result.success).toBe(false);
  });

  it('requires lockerId', () => {
    const { lockerId: _lockerId, ...withoutLocker } = baseShipment;
    const result = createParcelSchema.safeParse(withoutLocker);
    expect(result.success).toBe(false);
  });
});
