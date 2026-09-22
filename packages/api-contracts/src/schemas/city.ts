import { z } from 'zod';

export const cityStatusSchema = z.enum(['active', 'archived']);

export const createCitySchema = z.object({
  drcCityId: z.string().uuid('Ville invalide'),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateCitySchema = z.object({
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
