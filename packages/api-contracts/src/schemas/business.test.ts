import { describe, expect, it } from 'vitest';
import { registerBusinessAccountSchema, updateBusinessProfileSchema, updateBusinessStatusSchema } from './business.js';

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

describe('registerBusinessAccountSchema', () => {
  it('creates a company admin without a self-selected role', () => {
    expect(
      registerBusinessAccountSchema.safeParse({
        firstName: 'Chantal',
        lastName: 'Kasongo',
        email: 'chantal@boutique.cd',
        phone: '+243800000001',
        password: 'secret123',
      }).success,
    ).toBe(true);
  });

  it('accepts an invite token to join an existing company', () => {
    expect(
      registerBusinessAccountSchema.safeParse({
        firstName: 'Eric',
        lastName: 'Kabongo',
        email: 'eric@boutique.cd',
        phone: '+243800000002',
        password: 'secret123',
        inviteToken: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
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
