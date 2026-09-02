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
  city: zodEnum(DRC_CITIES),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: serviceAreaStatusSchema.optional().default('active'),
});

export const updateServiceAreaSchema = z.object({
  code: serviceAreaCodeSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  city: zodEnum(DRC_CITIES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: serviceAreaStatusSchema.optional(),
});

export const listServiceAreasQuerySchema = z.object({
  status: serviceAreaStatusSchema.optional(),
  city: zodEnum(DRC_CITIES).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateServiceAreaInput = z.infer<typeof createServiceAreaSchema>;
export type UpdateServiceAreaInput = z.infer<typeof updateServiceAreaSchema>;
export type ListServiceAreasQuery = z.infer<typeof listServiceAreasQuerySchema>;
