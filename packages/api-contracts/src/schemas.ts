import {
  BUSINESS_STATUSES,
  COMPARTMENT_STATUSES,
  DELIVERY_STATUSES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  LOCKER_STATUSES,
  PARCEL_STATUSES,
  USER_ROLES,
} from '@eveider/domain';
import { z } from 'zod';
import { zodEnum } from './zod-enum.js';

export const userRoleSchema = zodEnum(USER_ROLES);
export const parcelStatusSchema = zodEnum(PARCEL_STATUSES);
export const businessStatusSchema = zodEnum(BUSINESS_STATUSES);
export const lockerStatusSchema = zodEnum(LOCKER_STATUSES);
export const compartmentStatusSchema = zodEnum(COMPARTMENT_STATUSES);
export const deliveryStatusSchema = zodEnum(DELIVERY_STATUSES);
export const issueTypeSchema = zodEnum(ISSUE_TYPES);
export const issueStatusSchema = zodEnum(ISSUE_STATUSES);

export const uuidSchema = z.string().uuid();

export const businessIdSchema = uuidSchema;
