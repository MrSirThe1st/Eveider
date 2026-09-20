import { DRC_CITIES } from '@eveider/domain';
import { z } from 'zod';
import { zodEnum } from '../zod-enum.js';

export const serviceAreaStatusSchema = z.enum(['active', 'archived']);

const serviceAreaCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Code trop court')
  .max(12, 'Code trop long')
  .regex(/^[A-Z0-9_-]+$/, 'Code invalide (lettres, chiffres, - ou _)');

export const createServiceAreaSchema = z.object({
  code: serviceAreaCodeSchema,
  name: z.string().trim().min(2, 'Nom requis').max(120),
  city: zodEnum(DRC_CITIES).optional(),
  cityId: z.string().uuid('Ville invalide').optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: serviceAreaStatusSchema.optional().default('active'),
  outboundDeliveryAmount: z.number().min(0).max(10_000_000).nullable().optional(),
  returnDeliveryAmount: z.number().min(0).max(10_000_000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.city && !value.cityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ville requise',
      path: ['cityId'],
    });
  }
});

export const updateServiceAreaSchema = z.object({
  code: serviceAreaCodeSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  city: zodEnum(DRC_CITIES).optional(),
  cityId: z.string().uuid('Ville invalide').optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: serviceAreaStatusSchema.optional(),
  outboundDeliveryAmount: z.number().min(0).max(10_000_000).nullable().optional(),
  returnDeliveryAmount: z.number().min(0).max(10_000_000).nullable().optional(),
});

export const listServiceAreasQuerySchema = z.object({
  status: serviceAreaStatusSchema.optional(),
  city: zodEnum(DRC_CITIES).optional(),
  cityId: z.string().uuid('Ville invalide').optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateServiceAreaInput = z.infer<typeof createServiceAreaSchema>;
export type UpdateServiceAreaInput = z.infer<typeof updateServiceAreaSchema>;
export type ListServiceAreasQuery = z.infer<typeof listServiceAreasQuerySchema>;
