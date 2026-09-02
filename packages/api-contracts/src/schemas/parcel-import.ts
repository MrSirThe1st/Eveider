import { z } from 'zod';
import { createParcelSchema } from './parcel.js';

export const PARCEL_IMPORT_MAX_ROWS = 500;

export const parcelExportScopeSchema = z.enum(['filtered', 'all']);

export const businessParcelExportQuerySchema = z.object({
  scope: parcelExportScopeSchema.default('filtered'),
  location: z
    .enum([
      'awaiting_courier',
      'awaiting_dropoff',
      'courier_assigned',
      'in_transit',
      'at_locker',
      'ready_for_pickup',
      'return_in_progress',
      'returned_to_business',
      'collected',
    ])
    .optional(),
  search: z.string().trim().max(64).optional(),
});

export const parcelImportPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  valid: z.boolean(),
  errors: z.array(z.string()),
  data: createParcelSchema.optional(),
});

export const parcelImportConfirmSchema = z.object({
  ignoreErrors: z.boolean(),
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        data: createParcelSchema,
      }),
    )
    .min(1)
    .max(PARCEL_IMPORT_MAX_ROWS),
});

export const parcelImportErrorReportSchema = z.object({
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        errors: z.array(z.string()),
      }),
    )
    .min(1)
    .max(PARCEL_IMPORT_MAX_ROWS),
});

export type ParcelImportPreviewRow = z.infer<typeof parcelImportPreviewRowSchema>;
export type ParcelImportConfirmInput = z.infer<typeof parcelImportConfirmSchema>;
