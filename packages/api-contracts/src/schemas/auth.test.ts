import { describe, expect, it } from 'vitest';
import {
  changeAccountEmailSchema,
  changePasswordSchema,
  onboardUserSchema,
  registerMobileAccountSchema,
  resetPasswordSchema,
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

  it('validates password change payloads', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'secret123',
        newPassword: 'secret456',
        confirmPassword: 'secret456',
      }).success,
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'secret123',
        newPassword: 'secret456',
        confirmPassword: 'other',
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'secret123',
        newPassword: 'secret123',
        confirmPassword: 'secret123',
      }).success,
    ).toBe(false);
  });

  it('validates email change payloads', () => {
    expect(
      changeAccountEmailSchema.safeParse({
        email: 'nouveau@eveider.cd',
        currentPassword: 'secret123',
      }).success,
    ).toBe(true);
    expect(
      changeAccountEmailSchema.safeParse({
        email: 'pas-un-email',
        currentPassword: 'secret123',
      }).success,
    ).toBe(false);
    expect(
      changeAccountEmailSchema.safeParse({
        email: 'nouveau@eveider.cd',
        currentPassword: 'short',
      }).success,
    ).toBe(false);
  });

  it('validates password reset payloads', () => {
    expect(
      resetPasswordSchema.safeParse({
        newPassword: 'secret456',
        confirmPassword: 'secret456',
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        newPassword: 'secret456',
        confirmPassword: 'other',
      }).success,
    ).toBe(false);
  });

  it('validates phone OTP token length for mobile', () => {
    expect(verifyPhoneOtpSchema.safeParse({ phone: '+243800000000', token: '123456' }).success).toBe(
      true,
    );
    expect(verifyPhoneOtpSchema.safeParse({ phone: '+243800000000', token: '12' }).success).toBe(
      false,
    );
  });

  it('requires phone and full name for customer signup and rejects courier self-registration', async () => {
    expect(
      registerMobileAccountSchema.safeParse({
        role: 'customer',
        email: 'client@eveider.cd',
        password: 'secret123',
        phone: '+243800000000',
        fullName: 'Amina Kabongo',
      }).success,
    ).toBe(true);
    expect(
      registerMobileAccountSchema.safeParse({
        role: 'customer',
        email: 'client@eveider.cd',
        password: 'secret123',
        phone: '+243800000000',
      }).success,
    ).toBe(false);
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
    ).toBe(false);
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
