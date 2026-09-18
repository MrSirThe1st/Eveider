-- Hardware locker authorization sessions. Node-RED will call Eveider to ask
-- whether an action may happen, then confirm what physically happened.
-- Authorization does not change parcel occupancy; confirmation does.

CREATE TYPE "LockerAction" AS ENUM (
  'deposit',
  'driver_pickup',
  'recipient_collection',
  'business_return_pickup'
);

CREATE TYPE "LockerActionActorType" AS ENUM (
  'eveider_driver',
  'business_representative',
  'recipient'
);

CREATE TYPE "LockerActionSessionStatus" AS ENUM (
  'authorized',
  'confirmed',
  'expired',
  'cancelled'
);

CREATE TABLE "locker_action_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "action" "LockerAction" NOT NULL,
  "parcel_id" UUID NOT NULL,
  "locker_id" UUID NOT NULL,
  "compartment_id" UUID,
  "actor_type" "LockerActionActorType" NOT NULL,
  "actor_reference" TEXT NOT NULL,
  "status" "LockerActionSessionStatus" NOT NULL DEFAULT 'authorized',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "authorized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "device_event_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locker_action_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "locker_action_sessions"
  ADD CONSTRAINT "locker_action_sessions_parcel_id_fkey"
  FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "locker_action_sessions"
  ADD CONSTRAINT "locker_action_sessions_locker_id_fkey"
  FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "locker_action_sessions"
  ADD CONSTRAINT "locker_action_sessions_compartment_id_fkey"
  FOREIGN KEY ("compartment_id") REFERENCES "compartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One live authorization per parcel and per reserved compartment.
CREATE UNIQUE INDEX "locker_action_sessions_active_parcel_idx"
  ON "locker_action_sessions" ("parcel_id")
  WHERE "status" = 'authorized';

CREATE UNIQUE INDEX "locker_action_sessions_active_compartment_idx"
  ON "locker_action_sessions" ("compartment_id")
  WHERE "status" = 'authorized' AND "compartment_id" IS NOT NULL;

CREATE INDEX "locker_action_sessions_locker_status_idx"
  ON "locker_action_sessions" ("locker_id", "status", "expires_at");

CREATE UNIQUE INDEX "locker_action_sessions_device_event_idx"
  ON "locker_action_sessions" ("device_event_id")
  WHERE "device_event_id" IS NOT NULL;
