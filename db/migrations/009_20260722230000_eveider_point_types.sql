-- Eveider Points: smart lockers, partner shops, residential pickup points
CREATE TYPE "LockerType" AS ENUM ('SMART_LOCKER', 'PARTNER_POINT', 'RESIDENTIAL_LOCKER');
CREATE TYPE "CommissionType" AS ENUM ('fixed', 'percent');

ALTER TABLE "lockers"
  ADD COLUMN IF NOT EXISTS "type" "LockerType" NOT NULL DEFAULT 'SMART_LOCKER',
  ADD COLUMN IF NOT EXISTS "max_capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "commission_type" "CommissionType",
  ADD COLUMN IF NOT EXISTS "commission_value" NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS "commission_currency" TEXT;

ALTER TABLE "lockers"
  DROP CONSTRAINT IF EXISTS "lockers_max_capacity_check",
  DROP CONSTRAINT IF EXISTS "lockers_soft_capacity_fields_check";

ALTER TABLE "lockers"
  ADD CONSTRAINT "lockers_max_capacity_check"
    CHECK ("max_capacity" IS NULL OR "max_capacity" >= 1),
  ADD CONSTRAINT "lockers_soft_capacity_fields_check"
    CHECK (
      ("type" = 'SMART_LOCKER' AND "max_capacity" IS NULL)
      OR (
        "type" IN ('PARTNER_POINT', 'RESIDENTIAL_LOCKER')
        AND "max_capacity" IS NOT NULL
        AND "contact_phone" IS NOT NULL
      )
    );

CREATE INDEX IF NOT EXISTS "lockers_type_idx" ON "lockers"("type");
