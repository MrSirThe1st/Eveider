import { describe, expect, it } from 'vitest';
import { createParcelSchema, listParcelsQuerySchema, updateParcelStatusSchema } from './parcel.js';

describe('createParcelSchema', () => {
  it('accepts valid parcel input', () => {
    const result = createParcelSchema.safeParse({
      reference: 'CMD-2026-001',
      recipientName: 'Jean Mukendi',
      recipientPhone: '+243800000000',
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

  it('accepts missing merchant reference', () => {
    const result = createParcelSchema.safeParse({
      recipientPhone: '+243800000000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference).toBeUndefined();
    }
  });

  it('requires locker when compartment is set', () => {
    const result = createParcelSchema.safeParse({
      reference: 'CMD-1',
      recipientPhone: '+243800000000',
      compartmentId: '00000000-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(false);
  });
});
