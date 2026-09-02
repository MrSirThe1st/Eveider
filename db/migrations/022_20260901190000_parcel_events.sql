-- Operational audit spine for parcel lifecycle transitions.

CREATE TYPE "ParcelEventActorType" AS ENUM ('user', 'system', 'api_key');

CREATE TYPE "ParcelEventType" AS ENUM (
  'parcel.created',
  'parcel.status_changed',
  'delivery.assigned',
  'delivery.scanned',
  'delivery.drop_off_pending',
  'delivery.completed',
  'delivery.failed',
  'compartment.reserved',
  'compartment.occupied',
  'compartment.released',
  'pickup_pin.issued',
  'notification.sent',
  'notification.failed',
  'issue.opened'
);

CREATE TABLE "parcel_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "parcel_id" UUID NOT NULL,
  "delivery_id" UUID,
  "issue_id" UUID,
  "compartment_id" UUID,
  "event_type" "ParcelEventType" NOT NULL,
  "actor_type" "ParcelEventActorType" NOT NULL DEFAULT 'system',
  "actor_user_id" UUID,
  "previous_parcel_status" "ParcelStatus",
  "new_parcel_status" "ParcelStatus",
  "previous_delivery_status" "DeliveryStatus",
  "new_delivery_status" "DeliveryStatus",
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parcel_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "parcel_events_parcel_id_created_at_idx"
  ON "parcel_events" ("parcel_id", "created_at" DESC);

CREATE INDEX "parcel_events_delivery_id_idx"
  ON "parcel_events" ("delivery_id")
  WHERE "delivery_id" IS NOT NULL;

ALTER TABLE "parcel_events"
  ADD CONSTRAINT "parcel_events_parcel_id_fkey"
  FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parcel_events"
  ADD CONSTRAINT "parcel_events_delivery_id_fkey"
  FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "parcel_events"
  ADD CONSTRAINT "parcel_events_issue_id_fkey"
  FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "parcel_events"
  ADD CONSTRAINT "parcel_events_compartment_id_fkey"
  FOREIGN KEY ("compartment_id") REFERENCES "compartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "parcel_events"
  ADD CONSTRAINT "parcel_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
