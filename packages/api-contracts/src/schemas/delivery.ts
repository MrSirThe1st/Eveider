import { z } from 'zod';

export const assignCourierSchema = z.object({
  courierId: z.string().uuid('Coursier invalide'),
});

export const scanDeliverySchema = z.object({
  reference: z.string().min(1, 'Référence requise').max(64),
});

export const completeDropOffSchema = z.object({
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
  photoBase64: z
    .string()
    .trim()
    .min(32, 'Photo de dépôt requise')
    .max(1_200_000, 'Photo trop volumineuse'),
});

export const listDeliveriesQuerySchema = z.object({
  view: z.enum(['active', 'au_casier', 'collected', 'all']).optional(),
  status: z.enum(['assigned', 'scanned', 'drop_off_pending', 'completed', 'failed']).optional(),
  courierId: z.string().uuid('Coursier invalide').optional(),
  lockerId: z.string().uuid('Casier invalide').optional(),
  businessId: z.string().uuid('Entreprise invalide').optional(),
  search: z.string().trim().max(64).optional(),
});

export type AssignCourierInput = z.infer<typeof assignCourierSchema>;
export type ScanDeliveryInput = z.infer<typeof scanDeliverySchema>;
export type CompleteDropOffInput = z.infer<typeof completeDropOffSchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;

export const courierDetailResponseSchema = z.object({
  courier: z.object({
    id: z.string().uuid(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    isBlocked: z.boolean(),
    createdAt: z.string(),
  }),
  stats: z.object({
    total: z.number().int(),
    completed: z.number().int(),
    failed: z.number().int(),
    inProgress: z.number().int(),
  }),
  deliveries: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.string(),
      createdAt: z.string(),
      completedAt: z.string().nullable(),
      parcel: z.object({
        id: z.string().uuid(),
        reference: z.string(),
        businessName: z.string(),
        locker: z
          .object({
            name: z.string(),
            address: z.string(),
          })
          .nullable(),
      }),
    }),
  ),
});

export type CourierDetailResponse = z.infer<typeof courierDetailResponseSchema>;
