import { z } from 'zod';
import { commissionTypeSchema, compartmentStatusSchema, lockerStatusSchema, lockerTypeSchema } from '../schemas.js';

const gridDimensionSchema = z.number().int().min(1).max(12);

export { lockerTypeSchema, commissionTypeSchema };

export const compartmentSizeSchema = z.enum(['small', 'medium', 'large']);

export const compartmentLayoutCellSchema = z.object({
  label: z.string().min(1).max(10),
  size: compartmentSizeSchema,
});

export const createLockerStatusSchema = z.enum(['active', 'offline']);

const lockerCodeSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^EVP[0-9A-HJKMNP-TV-Z]{6}[0-9A-HJKMNP-TV-Z*~$=]$/, 'Code invalide (ex. EVPA7K3M2X)')
    .optional(),
);

const createLockerBaseSchema = z.object({
  type: lockerTypeSchema.default('SMART_LOCKER'),
  code: lockerCodeSchema,
  name: z.string().min(2, 'Nom requis').max(120),
  address: z.string().min(5, 'Adresse requise').max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: createLockerStatusSchema.default('active'),
  rows: gridDimensionSchema.optional(),
  columns: gridDimensionSchema.optional(),
  compartments: z.array(compartmentLayoutCellSchema).optional(),
  maxCapacity: z.number().int().min(1).max(5000).optional(),
  contactPhone: z.string().min(8, 'Téléphone requis').max(40).optional(),
  contactName: z.string().min(2).max(120).optional(),
  notes: z.string().max(2000).optional(),
  commissionType: commissionTypeSchema.nullable().optional(),
  commissionValue: z.number().positive().max(1_000_000).nullable().optional(),
  commissionCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Devise invalide (ex. CDF)')
    .nullable()
    .optional(),
});

export const createLockerSchema = createLockerBaseSchema.superRefine((value, ctx) => {
  if (value.type === 'SMART_LOCKER') {
    if (value.rows == null || value.columns == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dimensions de grille requises',
        path: ['rows'],
      });
      return;
    }
    const compartments = value.compartments ?? [];
    const expected = value.rows * value.columns;
    if (compartments.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La grille ${value.rows}×${value.columns} attend ${expected} compartiments`,
        path: ['compartments'],
      });
    }
    return;
  }

  if (value.maxCapacity == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Capacité maximale requise',
      path: ['maxCapacity'],
    });
  }
  if (!value.contactPhone?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Téléphone de contact requis',
      path: ['contactPhone'],
    });
  }
});

export const updateLockerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().min(5).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: lockerStatusSchema.optional(),
  maxCapacity: z.number().int().min(1).max(5000).optional(),
  contactPhone: z.string().min(8).max(40).optional(),
  contactName: z.string().min(2).max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  commissionType: commissionTypeSchema.nullable().optional(),
  commissionValue: z.number().positive().max(1_000_000).nullable().optional(),
  commissionCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Devise invalide (ex. CDF)')
    .nullable()
    .optional(),
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
  lockerId: z.string().uuid('Point invalide'),
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
