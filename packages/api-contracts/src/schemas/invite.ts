import { z } from 'zod';
import { emailSchema, phoneSchema } from './auth.js';

export const inviteTokenSchema = z.string().uuid('Lien d\'invitation invalide');

export const acceptInviteSchema = z.object({
  token: inviteTokenSchema,
});

export const onboardWithInviteSchema = z.object({
  inviteToken: inviteTokenSchema.optional(),
});

export const createParcelWithEmailSchema = z.object({
  recipientEmail: emailSchema.optional(),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
