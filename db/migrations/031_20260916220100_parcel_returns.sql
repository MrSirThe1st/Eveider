-- Flow 3 customer-return process. Separate from historical deliveries.kind=return (RTS).

CREATE TYPE "ParcelReturnStatus" AS ENUM (
  'requested',
  'authorized',
  'awaiting_pickup',
  'in_transit',
  'completed',
  'rejected',
  'cancelled'
);

CREATE TYPE "ParcelReturnMethod" AS ENUM (
  'eveider_return',
  'business_pickup'
);

CREATE TABLE "parcel_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "parcel_id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "status" "ParcelReturnStatus" NOT NULL DEFAULT 'requested',
  "method" "ParcelReturnMethod",
  "return_locker_id" UUID,
  "compartment_id" UUID,
  "return_code" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorized_at" TIMESTAMP(3),
  "deposited_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parcel_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parcel_returns_operational_check" CHECK (
    "status" IN ('requested', 'rejected', 'cancelled')
    OR ("method" IS NOT NULL AND "return_locker_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "parcel_returns_one_active_per_parcel_idx"
  ON "parcel_returns" ("parcel_id")
  WHERE "status" IN ('requested', 'authorized', 'awaiting_pickup', 'in_transit');

CREATE UNIQUE INDEX "parcel_returns_return_code_key"
  ON "parcel_returns" ("return_code")
  WHERE "return_code" IS NOT NULL;

CREATE INDEX "parcel_returns_business_id_status_idx"
  ON "parcel_returns" ("business_id", "status");

ALTER TABLE "parcel_returns"
  ADD CONSTRAINT "parcel_returns_parcel_id_fkey"
  FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parcel_returns"
  ADD CONSTRAINT "parcel_returns_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parcel_returns"
  ADD CONSTRAINT "parcel_returns_return_locker_id_fkey"
  FOREIGN KEY ("return_locker_id") REFERENCES "lockers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "parcel_returns"
  ADD CONSTRAINT "parcel_returns_compartment_id_fkey"
  FOREIGN KEY ("compartment_id") REFERENCES "compartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
