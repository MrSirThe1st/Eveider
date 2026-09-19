-- Collection credentials synchronized to SMART_LOCKER runtimes for Stage IV
-- offline recipient collection. PIN plaintext stays in pickup_pins only;
-- this table stores a SHA-256 hash for locker-side comparison.

CREATE TYPE "LockerCollectionCredentialStatus" AS ENUM (
  'pending',
  'active',
  'consumed',
  'revoked'
);

CREATE SEQUENCE "locker_collection_credential_seq";

CREATE TABLE "locker_collection_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "parcel_id" UUID NOT NULL,
  "locker_id" UUID NOT NULL,
  "compartment_id" UUID,
  "tracking_number" TEXT NOT NULL,
  "recipient_phone_normalized" TEXT NOT NULL,
  "pin_hash" TEXT NOT NULL,
  "status" "LockerCollectionCredentialStatus" NOT NULL DEFAULT 'pending',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_seq" BIGINT NOT NULL DEFAULT nextval('locker_collection_credential_seq'),
  "activated_at" TIMESTAMP(3),
  "consumed_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "collection_device_event_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locker_collection_credentials_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "locker_collection_credentials"
  ADD CONSTRAINT "locker_collection_credentials_parcel_id_fkey"
  FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "locker_collection_credentials"
  ADD CONSTRAINT "locker_collection_credentials_locker_id_fkey"
  FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "locker_collection_credentials"
  ADD CONSTRAINT "locker_collection_credentials_compartment_id_fkey"
  FOREIGN KEY ("compartment_id") REFERENCES "compartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "locker_collection_credentials_live_parcel_idx"
  ON "locker_collection_credentials" ("parcel_id")
  WHERE "status" IN ('pending', 'active');

CREATE UNIQUE INDEX "locker_collection_credentials_device_event_idx"
  ON "locker_collection_credentials" ("collection_device_event_id")
  WHERE "collection_device_event_id" IS NOT NULL;

CREATE INDEX "locker_collection_credentials_locker_seq_idx"
  ON "locker_collection_credentials" ("locker_id", "sync_seq");
