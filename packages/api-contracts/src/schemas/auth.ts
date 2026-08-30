import { z } from 'zod';
import { userRoleSchema } from '../schemas.js';

export const phoneSchema = z
  .string()
  .min(8, 'Numéro de téléphone invalide')
  .regex(/^\+?[0-9\s-]+$/, 'Format de téléphone invalide');

export const emailSchema = z.string().email('Adresse email invalide');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères');

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = signInSchema;

/** Mobile — phone OTP request */
export const requestPhoneOtpSchema = z.object({
  phone: phoneSchema,
});

/** Mobile — phone OTP verification */
export const verifyPhoneOtpSchema = z.object({
  phone: phoneSchema,
  token: z.string().length(6, 'Le code doit contenir 6 chiffres'),
});

export const registerMobileAccountSchema = z.object({
    role: z.literal('customer'),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema,
    fullName: z.string().min(2, 'Nom requis').optional(),
  });

export const onboardUserSchema = z.object({
  role: userRoleSchema,
  fullName: z.string().min(2).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  inviteToken: z.string().uuid().optional(),
  business: z
    .object({
      name: z.string().min(2, 'Nom entreprise requis'),
      contactEmail: emailSchema.optional(),
      contactPhone: phoneSchema.optional(),
    })
    .optional(),
});

export const updateAccountProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(80),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type RequestPhoneOtpInput = z.infer<typeof requestPhoneOtpSchema>;
export type VerifyPhoneOtpInput = z.infer<typeof verifyPhoneOtpSchema>;
export type OnboardUserInput = z.infer<typeof onboardUserSchema>;
export type RegisterMobileAccountInput = z.infer<typeof registerMobileAccountSchema>;
export type UpdateAccountProfileInput = z.infer<typeof updateAccountProfileSchema>;
