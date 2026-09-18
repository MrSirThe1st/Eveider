import { PARCEL_RETURN_METHODS } from '@eveider/domain';
import { z } from 'zod';
import { zodEnum } from '../zod-enum.js';

export const parcelReturnMethodSchema = zodEnum(PARCEL_RETURN_METHODS);

export const authorizeParcelReturnSchema = z.object({
  method: parcelReturnMethodSchema,
  returnLockerId: z.string().uuid('Casier de retour invalide'),
});

export const confirmRecipientReturnDepositSchema = z.object({
  lockerId: z.string().uuid('Casier invalide'),
  returnCode: z.string().trim().min(4, 'Code retour requis').max(12),
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
});

export type AuthorizeParcelReturnInput = z.infer<typeof authorizeParcelReturnSchema>;
export type ConfirmRecipientReturnDepositInput = z.infer<
  typeof confirmRecipientReturnDepositSchema
>;
