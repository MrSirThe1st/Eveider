import { z } from 'zod';

export const PLATFORM_DEFAULT_FEATURES = [
  'CREATE_SHIPMENT',
  'API_ACCESS',
  'COD',
  'MONTHLY_INVOICE',
] as const;

export const platformDefaultFeatureSchema = z.enum(PLATFORM_DEFAULT_FEATURES);

const nullablePositiveInt = (max: number) =>
  z.number().int().positive('Plafond invalide').max(max).nullable();

const nullablePositiveAmount = (max: number) =>
  z.number().positive('Plafond invalide').max(max).nullable();

export const updatePlatformSettingsSchema = z.object({
  pickupFeeAmount: z.number().positive('Montant invalide').max(10_000),
  pickupFeeCurrency: z
    .string()
    .trim()
    .length(3, 'Devise invalide (3 lettres)')
    .transform((value) => value.toUpperCase()),
  requireOrgApproval: z.boolean(),
  defaultDailyShipments: nullablePositiveInt(100_000),
  defaultMonthlyShipments: nullablePositiveInt(1_000_000),
  defaultMaxPackageValueUsd: nullablePositiveAmount(100_000),
  defaultCodDailyLimitUsd: nullablePositiveAmount(100_000),
  defaultEnabledFeatures: z.array(platformDefaultFeatureSchema).min(1, 'Au moins une fonction'),
  supportPhone: z.string().trim().max(32).optional(),
  dispatcherWhatsapp: z.string().trim().max(32).optional(),
});

export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;
