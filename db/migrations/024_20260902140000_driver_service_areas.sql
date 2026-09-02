-- Link driver dossiers to operational service areas (same pattern as lockers).

ALTER TABLE "driver_dossiers"
  ADD COLUMN "service_area_id" UUID;

CREATE INDEX "driver_dossiers_service_area_id_idx" ON "driver_dossiers" ("service_area_id");

ALTER TABLE "driver_dossiers"
  ADD CONSTRAINT "driver_dossiers_service_area_id_fkey"
  FOREIGN KEY ("service_area_id") REFERENCES "service_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from the business's primary address city when available.
UPDATE "driver_dossiers" d
SET "service_area_id" = sa."id",
    "updated_at" = NOW()
FROM "business_locations" bl
JOIN "service_areas" sa
  ON sa."status" = 'active'
 AND lower(sa."city") = lower(bl."city")
WHERE d."service_area_id" IS NULL
  AND d."business_id" IS NOT NULL
  AND bl."business_id" = d."business_id"
  AND bl."type" = 'business_address';

-- Fallback heuristics for seed emails / cities encoded in the address.
UPDATE "driver_dossiers" d
SET "service_area_id" = sa."id",
    "updated_at" = NOW()
FROM "service_areas" sa
WHERE d."service_area_id" IS NULL
  AND sa."status" = 'active'
  AND (
    (lower(d."email") LIKE '%lubum%' AND sa."code" = 'LSH')
    OR (lower(d."email") LIKE '%kolwezi%' AND sa."code" = 'KWZ')
    OR (lower(d."email") LIKE '%kinshasa%' AND sa."code" = 'KIN')
  );
