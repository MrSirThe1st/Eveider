-- Single platform-level operational currency (USD | CDF).
-- Existing parcel_charges / parcel_payments keep their snapshotted currency.
-- Newly configured prices and newly created charges read this setting.

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS platform_currency TEXT;

UPDATE platform_settings ps
SET platform_currency = COALESCE(
  (
    SELECT CASE
      WHEN dpr.currency IN ('USD', 'CDF') THEN dpr.currency
      ELSE NULL
    END
    FROM delivery_pricing_rules dpr
    ORDER BY dpr.updated_at DESC
    LIMIT 1
  ),
  CASE
    WHEN ps.pickup_fee_currency IN ('USD', 'CDF') THEN ps.pickup_fee_currency
    ELSE NULL
  END,
  'CDF'
)
WHERE ps.platform_currency IS NULL;

ALTER TABLE platform_settings
  ALTER COLUMN platform_currency SET DEFAULT 'CDF';

ALTER TABLE platform_settings
  ALTER COLUMN platform_currency SET NOT NULL;

ALTER TABLE platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_platform_currency_check;

ALTER TABLE platform_settings
  ADD CONSTRAINT platform_settings_platform_currency_check
    CHECK (platform_currency IN ('USD', 'CDF'));
