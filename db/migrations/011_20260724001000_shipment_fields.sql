-- Shipment fields on parcels (Create Shipment / Créer un envoi).

CREATE TYPE "PaymentResponsibility" AS ENUM ('sender_pays', 'receiver_pays', 'cod');

ALTER TABLE "parcels"
  ADD COLUMN IF NOT EXISTS "pickup_type" "PickupMethod",
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_address" TEXT,
  ADD COLUMN IF NOT EXISTS "package_size" TEXT,
  ADD COLUMN IF NOT EXISTS "package_length_cm" NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS "package_width_cm" NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS "package_height_cm" NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS "package_weight_kg" NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS "package_category" TEXT,
  ADD COLUMN IF NOT EXISTS "declared_value_cdf" NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS "declared_value_usd" NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS "payment_responsibility" "PaymentResponsibility",
  ADD COLUMN IF NOT EXISTS "cod_amount_cdf" NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS "cod_amount_usd" NUMERIC(14, 2);

-- Backfill existing rows with safe defaults.
UPDATE "parcels"
SET
  "pickup_type" = COALESCE("pickup_type", 'merchant_dropoff'),
  "sender_name" = COALESCE(NULLIF(TRIM("sender_name"), ''), 'Eveider'),
  "sender_phone" = COALESCE(NULLIF(TRIM("sender_phone"), ''), 'n/a'),
  "package_size" = COALESCE("package_size", 'medium'),
  "package_category" = COALESCE("package_category", 'other'),
  "payment_responsibility" = COALESCE("payment_responsibility", 'receiver_pays')
WHERE
  "pickup_type" IS NULL
  OR "sender_name" IS NULL
  OR "sender_phone" IS NULL
  OR "package_size" IS NULL
  OR "package_category" IS NULL
  OR "payment_responsibility" IS NULL;

ALTER TABLE "parcels"
  ALTER COLUMN "pickup_type" SET NOT NULL,
  ALTER COLUMN "pickup_type" SET DEFAULT 'merchant_dropoff',
  ALTER COLUMN "sender_name" SET NOT NULL,
  ALTER COLUMN "sender_phone" SET NOT NULL,
  ALTER COLUMN "package_size" SET NOT NULL,
  ALTER COLUMN "package_size" SET DEFAULT 'medium',
  ALTER COLUMN "package_category" SET NOT NULL,
  ALTER COLUMN "package_category" SET DEFAULT 'other',
  ALTER COLUMN "payment_responsibility" SET NOT NULL,
  ALTER COLUMN "payment_responsibility" SET DEFAULT 'receiver_pays';
