import { z } from 'zod';
import { compartmentLayoutCellSchema, compartmentSizeSchema } from './locker.js';

export const sizeMatchingModeSchema = z.enum(['exact', 'exact_or_larger']);
export const assignmentStrategySchema = z.enum([
  'smallest_fit',
  'first_available',
  'preferred_size',
]);

export const updateLockerNetworkSettingsSchema = z
  .object({
    sizeMatchingMode: sizeMatchingModeSchema,
    assignmentStrategy: assignmentStrategySchema,
    pickupHoldHours: z.number().int().min(1, 'Délai invalide').max(720),
    pickupReminderHours: z.number().int().min(0, 'Rappel invalide').max(720),
  })
  .superRefine((value, ctx) => {
    if (value.pickupReminderHours > value.pickupHoldHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le rappel doit être ≤ au délai de rétention',
        path: ['pickupReminderHours'],
      });
    }
  });

const gridDimensionSchema = z.number().int().min(1).max(12);

export const createLockerLayoutTemplateSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom requis').max(120),
    description: z.string().trim().max(500).optional().nullable(),
    rows: gridDimensionSchema,
    columns: gridDimensionSchema,
    cells: z.array(compartmentLayoutCellSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const expected = value.rows * value.columns;
    if (value.cells.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La grille ${value.rows}×${value.columns} attend ${expected} compartiments`,
        path: ['cells'],
      });
    }
    const sizes = new Set(value.cells.map((cell) => cell.size));
    for (const size of sizes) {
      if (!compartmentSizeSchema.safeParse(size).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Taille de compartiment invalide',
          path: ['cells'],
        });
      }
    }
  });

export const updateLockerLayoutTemplateSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom requis').max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    rows: gridDimensionSchema.optional(),
    columns: gridDimensionSchema.optional(),
    cells: z.array(compartmentLayoutCellSchema).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.rows != null && value.columns != null && value.cells != null) {
      const expected = value.rows * value.columns;
      if (value.cells.length !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La grille ${value.rows}×${value.columns} attend ${expected} compartiments`,
          path: ['cells'],
        });
      }
    }
  });

export type UpdateLockerNetworkSettingsInput = z.infer<typeof updateLockerNetworkSettingsSchema>;
export type CreateLockerLayoutTemplateInput = z.infer<typeof createLockerLayoutTemplateSchema>;
export type UpdateLockerLayoutTemplateInput = z.infer<typeof updateLockerLayoutTemplateSchema>;
