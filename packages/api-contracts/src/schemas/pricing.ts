import { z } from 'zod';

export const deliveryPricingCurrencySchema = z.enum(['USD', 'CDF']);

export const updateDeliveryPricingSchema = z.object({
  distanceThresholdKm: z.number().positive('Seuil invalide').max(1000),
  belowThresholdAmount: z.number().positive('Montant invalide').max(10_000_000),
  aboveThresholdAmount: z.number().positive('Montant invalide').max(10_000_000),
  currency: deliveryPricingCurrencySchema.optional(),
  smallCoefficient: z.number().positive('Coefficient invalide').max(10),
  mediumCoefficient: z.number().positive('Coefficient invalide').max(10),
  largeCoefficient: z.number().positive('Coefficient invalide').max(10),
  dropOffFeeAmount: z.number().min(0, 'Montant invalide').max(10_000_000),
  lockerRentalRateAmount: z.number().min(0, 'Montant invalide').max(10_000_000),
  lockerCollectionAmount: z.number().min(0, 'Montant invalide').max(10_000_000),
  returnLockerAmount: z.number().min(0, 'Montant invalide').max(10_000_000),
});

export const deliveryQuoteQuerySchema = z.object({
  lockerId: z.string().uuid('Casier invalide'),
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
  packageSize: z.enum(['small', 'medium', 'large']).optional(),
  senderAddress: z.string().trim().max(255).optional(),
  pickupType: z.enum(['courier_pickup', 'merchant_dropoff']).optional(),
});

export const returnQuoteQuerySchema = z.object({
  method: z.enum(['eveider_return', 'business_pickup']),
  returnLockerId: z.string().uuid('Casier de retour invalide'),
});

export const confirmMerchantDepositSchema = z.object({
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
});

export type UpdateDeliveryPricingInput = z.infer<typeof updateDeliveryPricingSchema>;
export type DeliveryQuoteQuery = z.infer<typeof deliveryQuoteQuerySchema>;
export type ReturnQuoteQuery = z.infer<typeof returnQuoteQuerySchema>;
export type ConfirmMerchantDepositInput = z.infer<typeof confirmMerchantDepositSchema>;
