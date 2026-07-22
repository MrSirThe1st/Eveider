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
