-- Customer-return physical parcel states, delivery kind, and events.
-- Additive only. Does not rewrite historical `kind=return` RTS rows.

ALTER TYPE "ParcelStatus" ADD VALUE IF NOT EXISTS 'return_at_point';
ALTER TYPE "ParcelStatus" ADD VALUE IF NOT EXISTS 'returning';
ALTER TYPE "ParcelStatus" ADD VALUE IF NOT EXISTS 'returned';

ALTER TYPE "DeliveryKind" ADD VALUE IF NOT EXISTS 'customer_return';

ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.requested';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.authorized';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.rejected';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.cancelled';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.deposited';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'parcel_return.completed';
