import {
  LOCKER_ACTIONS,
  LOCKER_ACTION_ACTOR_TYPES,
  LOCKER_DENIAL_REASONS,
} from '@eveider/domain';
import { z } from 'zod';
import { zodEnum } from '../zod-enum.js';

export const lockerActionSchema = zodEnum(LOCKER_ACTIONS);
export const lockerActionActorTypeSchema = zodEnum(LOCKER_ACTION_ACTOR_TYPES);
export const lockerDenialReasonSchema = zodEnum(LOCKER_DENIAL_REASONS);

const trackingNumberSchema = z.string().trim().min(1, 'Numéro de suivi requis').max(32);

const lockerDepositAuthorizeSchema = z.discriminatedUnion('actorType', [
  z.object({
    action: z.literal('deposit'),
    actorType: z.literal('eveider_driver'),
    driverId: z.string().uuid('Chauffeur invalide'),
    trackingNumber: trackingNumberSchema,
  }),
  z.object({
    action: z.literal('deposit'),
    actorType: z.literal('business_representative'),
    businessPhone: z.string().trim().min(8, 'Téléphone entreprise requis').max(40),
    trackingNumber: trackingNumberSchema,
  }),
  z.object({
    action: z.literal('deposit'),
    actorType: z.literal('recipient'),
    phone: z.string().trim().min(8, 'Téléphone requis').max(40),
    trackingNumber: trackingNumberSchema,
    returnCode: z.string().trim().min(4, 'Code retour requis').max(12),
  }),
]);

const lockerDriverPickupAuthorizeSchema = z.object({
  action: z.literal('driver_pickup'),
  actorType: z.literal('eveider_driver'),
  driverId: z.string().uuid('Chauffeur invalide'),
  trackingNumber: trackingNumberSchema,
});

const lockerRecipientCollectionAuthorizeSchema = z.object({
  action: z.literal('recipient_collection'),
  actorType: z.literal('recipient'),
  phone: z.string().trim().min(8, 'Téléphone requis').max(40),
  trackingNumber: trackingNumberSchema,
  pickupPin: z.string().trim().min(4, 'Code de retrait requis').max(12),
});

const lockerBusinessReturnPickupAuthorizeSchema = z.object({
  action: z.literal('business_return_pickup'),
  actorType: z.literal('business_representative'),
  businessPhone: z.string().trim().min(8, 'Téléphone entreprise requis').max(40),
  trackingNumber: trackingNumberSchema,
});

export const lockerActionAuthorizeSchema = z.union([
  lockerDepositAuthorizeSchema,
  lockerDriverPickupAuthorizeSchema,
  lockerRecipientCollectionAuthorizeSchema,
  lockerBusinessReturnPickupAuthorizeSchema,
]);

export const lockerActionConfirmSchema = z.object({
  result: z.literal('success').default('success'),
  doorOpenedAt: z.string().datetime().optional(),
  doorClosedAt: z.string().datetime().optional(),
  sensorConfirmed: z.boolean().optional(),
  deviceEventId: z.string().trim().min(1).max(128).optional(),
});

export const lockerActionCancelSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export type LockerActionAuthorizeInput = z.infer<typeof lockerActionAuthorizeSchema>;
export type LockerActionConfirmInput = z.infer<typeof lockerActionConfirmSchema>;
export type LockerActionCancelInput = z.infer<typeof lockerActionCancelSchema>;
