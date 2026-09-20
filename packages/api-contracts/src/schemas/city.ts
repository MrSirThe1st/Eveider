import { z } from 'zod';

export const cityStatusSchema = z.enum(['active', 'archived']);

const cityCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Code trop court')
  .max(12, 'Code trop long')
  .regex(/^[A-Z0-9_-]+$/, 'Code invalide (lettres, chiffres, - ou _)');

export const createCitySchema = z.object({
  code: cityCodeSchema,
  name: z.string().trim().min(2, 'Nom requis').max(120),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: cityStatusSchema.optional().default('active'),
});

export const updateCitySchema = z.object({
  code: cityCodeSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: cityStatusSchema.optional(),
});

export const listCitiesQuerySchema = z.object({
  status: cityStatusSchema.optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateCityInput = z.infer<typeof createCitySchema>;
export type UpdateCityInput = z.infer<typeof updateCitySchema>;
export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;
