import { z } from 'zod';

export const assignCourierSchema = z.object({
  courierId: z.string().uuid('Coursier invalide'),
});

export const scanDeliverySchema = z.object({
  reference: z.string().min(1, 'Référence requise').max(64),
});

export const listDeliveriesQuerySchema = z.object({
  status: z.enum(['assigned', 'scanned', 'drop_off_pending', 'completed', 'failed']).optional(),
  courierId: z.string().uuid('Coursier invalide').optional(),
  lockerId: z.string().uuid('Casier invalide').optional(),
  businessId: z.string().uuid('Entreprise invalide').optional(),
});

export type AssignCourierInput = z.infer<typeof assignCourierSchema>;
export type ScanDeliveryInput = z.infer<typeof scanDeliverySchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
