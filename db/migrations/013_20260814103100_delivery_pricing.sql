-- Admin-configurable delivery pricing + locked fee on parcel at creation.

CREATE TABLE IF NOT EXISTS delivery_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distance_threshold_km NUMERIC(8, 2) NOT NULL DEFAULT 10,
  below_threshold_amount_fc INTEGER NOT NULL DEFAULT 1500,
  above_threshold_amount_fc INTEGER NOT NULL DEFAULT 3000,
  small_coefficient NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  medium_coefficient NUMERIC(4, 2) NOT NULL DEFAULT 1.5,
  large_coefficient NUMERIC(4, 2) NOT NULL DEFAULT 2.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO delivery_pricing_rules (
  distance_threshold_km,
  below_threshold_amount_fc,
  above_threshold_amount_fc,
  small_coefficient,
  medium_coefficient,
  large_coefficient
)
SELECT 10, 1500, 3000, 1.0, 1.5, 2.0
WHERE NOT EXISTS (SELECT 1 FROM delivery_pricing_rules LIMIT 1);

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS delivery_fee_fc INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS pricing_size_used TEXT;
