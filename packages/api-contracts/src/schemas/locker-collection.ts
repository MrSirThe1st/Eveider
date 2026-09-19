import {
  LOCKER_COLLECTION_CREDENTIAL_STATUSES,
  LOCKER_COLLECTION_SYNC_CHANGE_TYPES,
  LOCKER_OCCUPANCY_STATES,
} from '@eveider/domain';
import { z } from 'zod';
import { zodEnum } from '../zod-enum.js';

export const lockerCollectionCredentialStatusSchema = zodEnum(
  LOCKER_COLLECTION_CREDENTIAL_STATUSES,
);
export const lockerCollectionSyncChangeTypeSchema = zodEnum(LOCKER_COLLECTION_SYNC_CHANGE_TYPES);
export const lockerOccupancySchema = zodEnum(LOCKER_OCCUPANCY_STATES);

export const lockerCollectionCredentialSyncQuerySchema = z.object({
  since: z.string().trim().regex(/^\d+$/, 'Curseur invalide').optional().default('0'),
});

export const lockerRecipientCollectionEventSchema = z.object({
  credentialId: z.string().uuid('Identifiant de credential invalide'),
  version: z.number().int().positive(),
  trackingNumber: z.string().trim().min(1).max(32),
  compartmentId: z.string().uuid('Compartiment invalide'),
  deviceEventId: z.string().trim().min(1).max(128),
  parcelId: z.string().uuid().optional(),
  doorOpenedAt: z.string().datetime().optional(),
  doorClosedAt: z.string().datetime().optional(),
  occupancy: lockerOccupancySchema.optional(),
});

export type LockerCollectionCredentialSyncQuery = z.infer<
  typeof lockerCollectionCredentialSyncQuerySchema
>;
export type LockerRecipientCollectionEventInput = z.infer<
  typeof lockerRecipientCollectionEventSchema
>;
