import { z } from 'zod';
import { phoneSchema } from './auth.js';

export const drcDepositProviderSchema = z.enum(['ORANGE_COD', 'AIRTEL_COD', 'VODACOM_MPESA_COD']);

export const initiatePickupPaymentSchema = z.object({
  provider: drcDepositProviderSchema,
  phoneNumber: phoneSchema.optional(),
});

export type InitiatePickupPaymentBody = z.infer<typeof initiatePickupPaymentSchema>;

export const pickupPaymentStatusSchema = z.enum([
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
]);

export type PickupPaymentStatus = z.infer<typeof pickupPaymentStatusSchema>;
