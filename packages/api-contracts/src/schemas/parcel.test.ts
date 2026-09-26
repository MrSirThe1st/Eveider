import { describe, expect, it } from 'vitest';
import { createParcelSchema, listParcelsQuerySchema, updateParcelDueAtSchema, updateParcelStatusSchema } from './parcel.js';

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

  it('accepts operational attention filters', () => {
    expect(listParcelsQuerySchema.safeParse({ attention: 'awaiting_assignment' }).success).toBe(
      true,
    );
    expect(listParcelsQuerySchema.safeParse({ pickupType: 'merchant_dropoff' }).success).toBe(true);
  });

  it('accepts valid status update', () => {
    expect(updateParcelStatusSchema.safeParse({ status: 'in_transit' }).success).toBe(true);
  });

  it('accepts nullable dueAt updates', () => {
    expect(updateParcelDueAtSchema.safeParse({ dueAt: '2026-09-27T10:00:00.000Z' }).success).toBe(
      true,
    );
    expect(updateParcelDueAtSchema.safeParse({ dueAt: null }).success).toBe(true);
    expect(updateParcelDueAtSchema.safeParse({ dueAt: 'not-a-date' }).success).toBe(false);
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

  it('accepts optional dueAt and driverInstructions', () => {
    const result = createParcelSchema.safeParse({
      ...baseShipment,
      dueAt: '2026-09-27T10:00:00.000Z',
      driverInstructions: 'Sonner à la porte bleue',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueAt).toBe('2026-09-27T10:00:00.000Z');
      expect(result.data.driverInstructions).toBe('Sonner à la porte bleue');
    }
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
