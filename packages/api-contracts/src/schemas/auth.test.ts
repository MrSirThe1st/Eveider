import { describe, expect, it } from 'vitest';
import {
  onboardUserSchema,
  registerMobileAccountSchema,
  signInSchema,
  verifyPhoneOtpSchema,
} from './auth.js';

describe('auth schemas', () => {
  it('validates email and password sign-in', () => {
    expect(
      signInSchema.safeParse({ email: 'contact@eveider.cd', password: 'secret123' }).success,
    ).toBe(true);
    expect(signInSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
  });

  it('validates phone OTP token length for mobile', () => {
    expect(verifyPhoneOtpSchema.safeParse({ phone: '+243800000000', token: '123456' }).success).toBe(
      true,
    );
    expect(verifyPhoneOtpSchema.safeParse({ phone: '+243800000000', token: '12' }).success).toBe(
      false,
    );
  });

  it('requires a phone for customer signup and allows courier without one', () => {
    expect(
      registerMobileAccountSchema.safeParse({
        role: 'customer',
        email: 'client@eveider.cd',
        password: 'secret123',
        phone: '+243800000000',
      }).success,
    ).toBe(true);
    expect(
      registerMobileAccountSchema.safeParse({
        role: 'customer',
        email: 'client@eveider.cd',
        password: 'secret123',
      }).success,
    ).toBe(false);
    expect(
      registerMobileAccountSchema.safeParse({
        role: 'courier',
        email: 'coursier@eveider.cd',
        password: 'secret123',
      }).success,
    ).toBe(true);
  });

  it('requires business payload for business role', () => {
    const result = onboardUserSchema.safeParse({
      role: 'business',
      email: 'contact@eveider.cd',
      business: { name: 'Eveider Shop', contactEmail: 'contact@eveider.cd' },
    });
    expect(result.success).toBe(true);
  });
});
