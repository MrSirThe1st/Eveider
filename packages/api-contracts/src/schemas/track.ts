import { z } from 'zod';
import { phoneSchema } from './auth.js';

export const guestTrackLookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(2, 'Référence colis requise')
    .max(64, 'Référence trop longue'),
  phone: phoneSchema,
});

export type GuestTrackLookupInput = z.infer<typeof guestTrackLookupSchema>;
