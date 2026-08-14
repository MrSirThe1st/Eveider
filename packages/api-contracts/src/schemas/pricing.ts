import { z } from 'zod';

export const updateDeliveryPricingSchema = z.object({
  distanceThresholdKm: z.number().positive('Seuil invalide').max(1000),
  belowThresholdAmountFc: z.number().int().positive('Montant invalide'),
  aboveThresholdAmountFc: z.number().int().positive('Montant invalide'),
  smallCoefficient: z.number().positive('Coefficient invalide').max(10),
  mediumCoefficient: z.number().positive('Coefficient invalide').max(10),
  largeCoefficient: z.number().positive('Coefficient invalide').max(10),
});

export const deliveryQuoteQuerySchema = z.object({
  lockerId: z.string().uuid('Point invalide'),
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
  packageSize: z.enum(['small', 'medium', 'large']),
  senderAddress: z.string().trim().max(255).optional(),
});

export type UpdateDeliveryPricingInput = z.infer<typeof updateDeliveryPricingSchema>;
export type DeliveryQuoteQuery = z.infer<typeof deliveryQuoteQuerySchema>;
