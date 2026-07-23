import { z } from 'zod';
import { parcelStatusSchema } from '../schemas.js';
import { emailSchema, phoneSchema } from './auth.js';

export const listParcelsQuerySchema = z.object({
  status: parcelStatusSchema.optional(),
});

export const createParcelSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .max(64, 'Référence trop longue')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    recipientName: z.string().min(2, 'Nom destinataire requis').optional(),
    recipientPhone: phoneSchema,
    recipientEmail: emailSchema.optional(),
    lockerId: z.string().uuid('Casier invalide').optional(),
    compartmentId: z.string().uuid('Compartiment invalide').optional(),
  })
  .refine((data) => !data.compartmentId || data.lockerId, {
    message: 'Casier requis avec le compartiment',
    path: ['lockerId'],
  });

export const updateParcelStatusSchema = z.object({
  status: parcelStatusSchema,
});

export type ListParcelsQuery = z.infer<typeof listParcelsQuerySchema>;
export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type UpdateParcelStatusInput = z.infer<typeof updateParcelStatusSchema>;
