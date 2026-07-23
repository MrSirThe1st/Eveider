-- Public Eveider tracking numbers + global Eveider Point codes (EVP).
-- Merchant `reference` becomes optional (business order # alongside tracking).

ALTER TABLE "parcels"
  ADD COLUMN IF NOT EXISTS "tracking_number" TEXT;

-- Backfill tracking numbers for existing parcels (stable, unique; legacy rows may
-- not carry a Crockford checksum — lookups match DB values, generators emit valid ones).
UPDATE "parcels"
SET "tracking_number" = upper(
  'EVD'
  || to_char(COALESCE("created_at", CURRENT_TIMESTAMP), 'YY')
  || substr(md5(id::text), 1, 8)
)
WHERE "tracking_number" IS NULL;

-- Resolve any theoretical collision after backfill (extremely unlikely).
DO $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT tracking_number
    FROM parcels
    GROUP BY tracking_number
    HAVING COUNT(*) > 1
  LOOP
    FOR r IN
      SELECT id FROM parcels WHERE tracking_number = r.tracking_number OFFSET 1
    LOOP
      n := n + 1;
      UPDATE parcels
      SET tracking_number = upper('EVD' || to_char(CURRENT_TIMESTAMP, 'YY') || substr(md5(id::text || n::text), 1, 8))
      WHERE id = r.id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "parcels"
  ALTER COLUMN "tracking_number" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "parcels_tracking_number_key"
  ON "parcels" ("tracking_number");

ALTER TABLE "parcels"
  ALTER COLUMN "reference" DROP NOT NULL;

-- Migrate legacy city codes (KIN-001) to global EVP-shaped codes.
UPDATE "lockers"
SET "code" = upper('EVP' || substr(md5(id::text), 1, 7))
WHERE "code" !~ '^EVP';

-- Deduplicate PIN codes before adding uniqueness (keep earliest row).
DELETE FROM pickup_pins a
USING pickup_pins b
WHERE a.code = b.code
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS "pickup_pins_code_key"
  ON "pickup_pins" ("code");
