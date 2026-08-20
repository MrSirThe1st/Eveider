import { describe, expect, it } from 'vitest';
import { updateBusinessProfileSchema, updateBusinessStatusSchema } from './business.js';

describe('updateBusinessStatusSchema', () => {
  it('accepts valid business status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});

describe('updateBusinessProfileSchema', () => {
  it('accepts contacts', () => {
    expect(
      updateBusinessProfileSchema.safeParse({
        fullName: 'Marie Kabila',
        contactEmail: 'ops@boutique.cd',
        contactPhone: '+243800000001',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(
      updateBusinessProfileSchema.safeParse({
        contactEmail: 'not-an-email',
        contactPhone: '+243800000001',
      }).success,
    ).toBe(false);
  });
});

describe('updateBusinessStatusSchema', () => {
  it('accepts valid business status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});
