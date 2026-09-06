-- Business drop-off fee + locker rental rate + parcel charge ledger.
-- Free retention window remains locker_network_settings.pickup_hold_hours (default → 72h).

-- ---------------------------------------------------------------------------
-- delivery_pricing_rules: drop-off + rental (same USD|CDF currency)
-- ---------------------------------------------------------------------------
ALTER TABLE delivery_pricing_rules
  ADD COLUMN IF NOT EXISTS drop_off_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS locker_rental_rate_amount NUMERIC(12, 2) NOT NULL DEFAULT 200;

ALTER TABLE delivery_pricing_rules
  DROP CONSTRAINT IF EXISTS delivery_pricing_rules_drop_off_fee_amount_check,
  DROP CONSTRAINT IF EXISTS delivery_pricing_rules_locker_rental_rate_amount_check;

ALTER TABLE delivery_pricing_rules
  ADD CONSTRAINT delivery_pricing_rules_drop_off_fee_amount_check
    CHECK (drop_off_fee_amount >= 0),
  ADD CONSTRAINT delivery_pricing_rules_locker_rental_rate_amount_check
    CHECK (locker_rental_rate_amount >= 0);

-- ---------------------------------------------------------------------------
-- Free hold default: 72 hours (admin-configurable)
-- ---------------------------------------------------------------------------
ALTER TABLE locker_network_settings
  ALTER COLUMN pickup_hold_hours SET DEFAULT 72;

UPDATE locker_network_settings
SET pickup_hold_hours = 72
WHERE pickup_hold_hours = 48;

-- ---------------------------------------------------------------------------
-- parcels: clock for rental free window
-- ---------------------------------------------------------------------------
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- parcel_charges: small ledger (collection/invoicing later)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "ParcelChargeKind" AS ENUM ('delivery_fee', 'drop_off_fee', 'locker_rental');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ParcelChargeStatus" AS ENUM ('pending', 'owed', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS parcel_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind "ParcelChargeKind" NOT NULL,
  status "ParcelChargeStatus" NOT NULL DEFAULT 'owed',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CDF'
    CHECK (currency IN ('USD', 'CDF')),
  unit_rate NUMERIC(12, 2),
  quantity NUMERIC(12, 2),
  period_started_at TIMESTAMPTZ,
  period_ended_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parcel_charges_amount_nonneg CHECK (amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS parcel_charges_parcel_kind_uidx
  ON parcel_charges (parcel_id, kind)
  WHERE status <> 'void';

CREATE INDEX IF NOT EXISTS parcel_charges_business_idx
  ON parcel_charges (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS parcel_charges_parcel_idx
  ON parcel_charges (parcel_id);
