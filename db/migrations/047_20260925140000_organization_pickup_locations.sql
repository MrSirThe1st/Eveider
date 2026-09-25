-- Named reusable pickup locations for businesses + parcel pickup snapshot for drivers.

ALTER TABLE "business_locations"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "instructions" TEXT,
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

-- One default pickup location per business.
CREATE UNIQUE INDEX IF NOT EXISTS "business_locations_one_default_pickup_key"
  ON "business_locations" ("business_id")
  WHERE "is_default" = true AND "type" = 'pickup_point';

-- Backfill: oldest pickup_point per business becomes default; give a usable label.
UPDATE "business_locations" loc
SET
  "is_default" = true,
  "name" = COALESCE(NULLIF(TRIM(loc."name"), ''), 'Adresse de collecte'),
  "updated_at" = NOW()
FROM (
  SELECT DISTINCT ON ("business_id") "id"
  FROM "business_locations"
  WHERE "type" = 'pickup_point'
  ORDER BY "business_id", "created_at" ASC
) first_pickup
WHERE loc."id" = first_pickup."id";

UPDATE "business_locations"
SET "name" = COALESCE(NULLIF(TRIM("name"), ''), 'Adresse de collecte')
WHERE "type" = 'pickup_point' AND ("name" IS NULL OR TRIM("name") = '');

ALTER TABLE "parcels"
  ADD COLUMN IF NOT EXISTS "pickup_location_id" UUID,
  ADD COLUMN IF NOT EXISTS "sender_location_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sender_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sender_instructions" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parcels_pickup_location_id_fkey'
  ) THEN
    ALTER TABLE "parcels"
      ADD CONSTRAINT "parcels_pickup_location_id_fkey"
      FOREIGN KEY ("pickup_location_id")
      REFERENCES "business_locations"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "parcels_pickup_location_id_idx"
  ON "parcels" ("pickup_location_id");
