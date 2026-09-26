import { z } from 'zod';

export const assignCourierSchema = z.object({
  courierId: z.string().uuid('Chauffeur invalide'),
  kind: z.enum(['outbound', 'return', 'customer_return']).optional().default('outbound'),
});

export const scanDeliverySchema = z.object({
  reference: z.string().min(1, 'Référence requise').max(64),
});

export const acceptDeliverySchema = z.object({}).strict();

export const startDeliverySchema = z.object({}).strict();

export const confirmPickupSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('scan'),
    reference: z.string().min(1, 'Référence requise').max(64),
  }),
  z.object({
    mode: z.literal('manual'),
  }),
]);

export const claimDeliverySchema = z.object({
  parcelId: z.string().uuid('Colis invalide'),
  kind: z.enum(['outbound', 'return', 'customer_return']).optional().default('outbound'),
});

export const updateDriverAvailabilitySchema = z.object({
  isAcceptingWork: z.boolean(),
});

export const updateDriverProfileSchema = z.object({
  vehicleType: z
    .enum(['on_foot', 'bicycle', 'motorcycle', 'car', 'van'])
    .nullable()
    .optional(),
  vehicleMakeModel: z.string().trim().max(120).nullable().optional(),
  vehiclePlate: z.string().trim().max(32).nullable().optional(),
  vehicleColor: z.string().trim().max(64).nullable().optional(),
});

export const completeDropOffSchema = z.object({
  compartmentId: z.string().uuid('Compartiment invalide').optional(),
  photoBase64: z
    .string()
    .trim()
    .min(32, 'Photo de dépôt requise')
    .max(1_200_000, 'Photo trop volumineuse'),
});

export const completeCustomerReturnToBusinessSchema = z.object({
  photoBase64: z
    .string()
    .trim()
    .min(32, 'Photo trop courte')
    .max(1_200_000, 'Photo trop volumineuse')
    .optional(),
});

export const listDeliveriesQuerySchema = z.object({
  view: z.enum(['active', 'all']).optional(),
  status: z
    .enum([
      'assigned',
      'accepted',
      'started',
      'scanned',
      'drop_off_pending',
      'completed',
      'failed',
    ])
    .optional(),
  courierId: z.string().uuid('Chauffeur invalide').optional(),
  lockerId: z.string().uuid('Casier invalide').optional(),
  businessId: z.string().uuid('Entreprise invalide').optional(),
  search: z.string().trim().max(64).optional(),
  /** When false, skip static filter catalogs (couriers / lockers / businesses). Used by silent board refresh. */
  includeMeta: z
    .union([z.literal('0'), z.literal('1'), z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return true;
      if (typeof value === 'boolean') return value;
      return value === '1' || value === 'true';
    }),
});

export type AssignCourierInput = z.infer<typeof assignCourierSchema>;
export type ScanDeliveryInput = z.infer<typeof scanDeliverySchema>;
export type AcceptDeliveryInput = z.infer<typeof acceptDeliverySchema>;
export type StartDeliveryInput = z.infer<typeof startDeliverySchema>;
export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;
export type ClaimDeliveryInput = z.infer<typeof claimDeliverySchema>;
export type UpdateDriverAvailabilityInput = z.infer<typeof updateDriverAvailabilitySchema>;
export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>;
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
