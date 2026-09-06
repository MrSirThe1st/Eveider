import { z } from 'zod';
import { parcelStatusSchema } from '../schemas.js';
import { emailSchema, phoneSchema } from './auth.js';
import { pickupMethodSchema } from './business.js';

export const packageSizeSchema = z.enum(['small', 'medium', 'large']);

export const packageCategorySchema = z.enum([
  'documents',
  'fashion',
  'electronics',
  'food',
  'cosmetics',
  'other',
]);

export const paymentResponsibilitySchema = z.enum([
  'sender_pays',
  'receiver_pays',
  'cod',
]);

const optionalPositiveNumber = z
  .number()
  .positive('Doit être positif')
  .max(1_000_000_000)
  .optional()
  .nullable()
  .transform((value) => (value == null ? undefined : value));

export const listParcelsQuerySchema = z.object({
  status: parcelStatusSchema.optional(),
  search: z.string().trim().max(64).optional(),
});

export const createParcelSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .max(64, 'Référence trop longue')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    pickupType: pickupMethodSchema,
    senderName: z.string().trim().min(2, 'Nom expéditeur requis').max(120),
    senderPhone: phoneSchema,
    senderAddress: z
      .string()
      .trim()
      .max(255)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    recipientName: z.string().trim().min(2, 'Nom destinataire requis').max(120),
    recipientPhone: phoneSchema,
    recipientEmail: emailSchema.optional(),
    lockerId: z.string().uuid('Point de retrait requis'),
    compartmentId: z.string().uuid('Compartiment invalide').optional(),
    packageSize: packageSizeSchema,
    packageLengthCm: optionalPositiveNumber,
    packageWidthCm: optionalPositiveNumber,
    packageHeightCm: optionalPositiveNumber,
    packageWeightKg: optionalPositiveNumber,
    packageCategory: packageCategorySchema,
    declaredValueCdf: optionalPositiveNumber,
    declaredValueUsd: optionalPositiveNumber,
    paymentResponsibility: paymentResponsibilitySchema,
    codAmountCdf: optionalPositiveNumber,
    codAmountUsd: optionalPositiveNumber,
  })
  .superRefine((data, ctx) => {
    if (data.pickupType === 'courier_pickup' && !data.senderAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adresse expéditeur requise pour une collecte par chauffeur',
        path: ['senderAddress'],
      });
    }

    if (data.paymentResponsibility === 'cod') {
      if (data.codAmountCdf == null && data.codAmountUsd == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Montant COD requis (CDF ou USD)',
          path: ['codAmountCdf'],
        });
      }
    }
  });

export const updateParcelStatusSchema = z.object({
  status: parcelStatusSchema,
});

export type ListParcelsQuery = z.infer<typeof listParcelsQuerySchema>;
export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type UpdateParcelStatusInput = z.infer<typeof updateParcelStatusSchema>;
