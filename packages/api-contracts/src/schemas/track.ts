import { z } from 'zod';
import { phoneSchema } from './auth.js';

const trackingNumberSchema = z
  .string()
  .trim()
  .min(8, 'Numéro de suivi requis')
  .max(32, 'Numéro de suivi trop long');

export const guestTrackLookupSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('tracking'),
    trackingNumber: trackingNumberSchema,
  }),
  z.object({
    mode: z.literal('phone'),
    phone: phoneSchema,
  }),
  /** Legacy deep links: ?ref=&phone= */
  z.object({
    mode: z.literal('legacy'),
    reference: z.string().trim().min(2).max(64),
    phone: phoneSchema,
  }),
]);

export type GuestTrackLookupInput = z.infer<typeof guestTrackLookupSchema>;
