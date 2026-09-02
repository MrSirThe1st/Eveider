-- Service areas: operational geography (city-scoped zones). Lockers optionally link to one area.

CREATE TYPE "ServiceAreaStatus" AS ENUM ('active', 'archived');

CREATE TABLE "service_areas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "status" "ServiceAreaStatus" NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_areas_code_key" ON "service_areas" (lower("code"));
CREATE INDEX "service_areas_city_idx" ON "service_areas" ("city");
CREATE INDEX "service_areas_status_idx" ON "service_areas" ("status");

ALTER TABLE "lockers"
  ADD COLUMN "service_area_id" UUID;

CREATE INDEX "lockers_service_area_id_idx" ON "lockers" ("service_area_id");

ALTER TABLE "lockers"
  ADD CONSTRAINT "lockers_service_area_id_fkey"
  FOREIGN KEY ("service_area_id") REFERENCES "service_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed starter areas for current DRC operating cities.
INSERT INTO "service_areas" ("code", "name", "city", "status", "notes")
VALUES
  ('KIN', 'Kinshasa', 'Kinshasa', 'active', 'Zone principale Kinshasa'),
  ('LSH', 'Lubumbashi', 'Lubumbashi', 'active', 'Zone principale Lubumbashi'),
  ('KWZ', 'Kolwezi', 'Kolwezi', 'active', 'Zone principale Kolwezi');

-- Backfill lockers that already have a matching city.
UPDATE "lockers" l
SET "service_area_id" = sa."id",
    "updated_at" = NOW()
FROM "service_areas" sa
WHERE l."service_area_id" IS NULL
  AND l."city" IS NOT NULL
  AND lower(l."city") = lower(sa."city")
  AND sa."status" = 'active';
