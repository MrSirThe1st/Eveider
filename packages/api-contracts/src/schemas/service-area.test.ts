import { describe, expect, it } from 'vitest';
import { createServiceAreaSchema, updateServiceAreaSchema } from './service-area.js';

describe('createServiceAreaSchema', () => {
  it('creates a zone without configuring prices', () => {
    const result = createServiceAreaSchema.safeParse({
      name: 'Golf',
      city: 'Kolwezi',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.outboundDeliveryAmount).toBeUndefined();
      expect(result.data.returnDeliveryAmount).toBeUndefined();
    }
  });

  it('accepts explicit zero prices', () => {
    const result = createServiceAreaSchema.safeParse({
      name: 'Gombe',
      city: 'Kinshasa',
      outboundDeliveryAmount: 0,
      returnDeliveryAmount: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts cityId instead of city name', () => {
    const result = createServiceAreaSchema.safeParse({
      name: 'Kenya',
      cityId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a typed zone code payload', () => {
    expect(
      createServiceAreaSchema.parse({
        code: 'KWZ-DILALA',
        name: 'Dilala',
        city: 'Kolwezi',
      }),
    ).toEqual(
      expect.objectContaining({
        name: 'Dilala',
        city: 'Kolwezi',
      }),
    );
    expect(
      createServiceAreaSchema.parse({
        code: 'KWZ-DILALA',
        name: 'Dilala',
        city: 'Kolwezi',
      }),
    ).not.toHaveProperty('code');
  });

  it('rejects a zone without a city', () => {
    expect(
      createServiceAreaSchema.safeParse({
        name: 'Somewhere',
      }).success,
    ).toBe(false);
  });
});

describe('updateServiceAreaSchema', () => {
  it('accepts nullable amounts so pricing can stay unconfigured', () => {
    const result = updateServiceAreaSchema.safeParse({
      outboundDeliveryAmount: null,
      returnDeliveryAmount: null,
    });
    expect(result.success).toBe(true);
  });

  it('ignores a code change because the platform owns the slug', () => {
    expect(updateServiceAreaSchema.parse({ code: 'KWZ-GOLF', name: 'Golf' })).toEqual({
      name: 'Golf',
    });
  });
});
