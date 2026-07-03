import { z } from 'zod';
import { compartmentStatusSchema, lockerStatusSchema } from '../schemas.js';

const gridDimensionSchema = z.number().int().min(1).max(12);

export const compartmentSizeSchema = z.enum(['small', 'medium', 'large']);

export const compartmentLayoutCellSchema = z.object({
  label: z.string().min(1).max(10),
  size: compartmentSizeSchema,
});

export const createLockerStatusSchema = z.enum(['active', 'offline']);

export const createLockerSchema = z
  .object({
    code: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z
        .string()
        .regex(/^[A-Z]{2,4}-\d{3}$/, 'Code invalide (ex. KOL-014)')
        .optional(),
    ),
    name: z.string().min(2, 'Nom requis').max(120),
    address: z.string().min(5, 'Adresse requise').max(255),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    rows: gridDimensionSchema,
    columns: gridDimensionSchema,
    compartments: z.array(compartmentLayoutCellSchema).min(1),
    status: createLockerStatusSchema.default('active'),
  })
  .superRefine((value, ctx) => {
    const expected = value.rows * value.columns;
    if (value.compartments.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La grille ${value.rows}×${value.columns} attend ${expected} compartiments`,
        path: ['compartments'],
      });
    }
  });

export const updateLockerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().min(5).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: lockerStatusSchema.optional(),
});

export const nearestLockersQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  selectableOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const selectParcelLockerSchema = z.object({
  lockerId: z.string().uuid('Casier invalide'),
});

export const updateLockerStatusSchema = z.object({
  status: lockerStatusSchema,
});

export const updateCompartmentStatusSchema = z.object({
  status: compartmentStatusSchema,
});

export type CreateLockerInput = z.infer<typeof createLockerSchema>;
export type UpdateLockerInput = z.infer<typeof updateLockerSchema>;
export type NearestLockersQuery = z.infer<typeof nearestLockersQuerySchema>;
export type SelectParcelLockerInput = z.infer<typeof selectParcelLockerSchema>;
export type UpdateLockerStatusInput = z.infer<typeof updateLockerStatusSchema>;
export type UpdateCompartmentStatusInput = z.infer<typeof updateCompartmentStatusSchema>;
