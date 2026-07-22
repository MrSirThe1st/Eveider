-- Locker human-readable codes + per-compartment size (future mixed layouts)

CREATE TYPE "CompartmentSize" AS ENUM ('small', 'medium', 'large');

ALTER TABLE "lockers" ADD COLUMN IF NOT EXISTS "code" TEXT;

WITH numbered AS (
  SELECT
    id,
    'KIN-' || LPAD(ROW_NUMBER() OVER (ORDER BY "created_at")::text, 3, '0') AS new_code
  FROM "lockers"
  WHERE "code" IS NULL
)
UPDATE "lockers" AS l
SET "code" = n.new_code
FROM numbered AS n
WHERE l.id = n.id;

ALTER TABLE "lockers" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "lockers_code_key" ON "lockers"("code");

ALTER TABLE "compartments" ADD COLUMN IF NOT EXISTS "size" "CompartmentSize" NOT NULL DEFAULT 'medium';
