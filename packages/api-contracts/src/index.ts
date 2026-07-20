export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function fail<T>(error: string): ApiResult<T> {
  return { success: false, error };
}

export * from './schemas.js';
export * from './schemas/auth.js';
export * from './schemas/parcel.js';
export * from './schemas/business.js';
export * from './schemas/locker.js';
export * from './schemas/delivery.js';
export * from './schemas/issue.js';
export * from './schemas/invite.js';
export * from './schemas/payment.js';
export * from './zod-enum.js';
