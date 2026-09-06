-- Nullable org/platform caps (NULL = unlimited) + delivery pricing currency (USD|CDF).

-- ---------------------------------------------------------------------------
-- platform_settings: nullable defaults
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'platform_settings'
      AND con.contype = 'c'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%default_daily_shipments%'
        OR pg_get_constraintdef(con.oid) ILIKE '%default_monthly_shipments%'
        OR pg_get_constraintdef(con.oid) ILIKE '%default_max_package_value_usd%'
        OR pg_get_constraintdef(con.oid) ILIKE '%default_cod_daily_limit_usd%'
        OR pg_get_constraintdef(con.oid) ILIKE '%pickup_fee_amount%'
        OR pg_get_constraintdef(con.oid) ILIKE '%pickup_fee_currency%'
      )
  LOOP
    EXECUTE format('ALTER TABLE platform_settings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE platform_settings
  ALTER COLUMN default_daily_shipments DROP NOT NULL,
  ALTER COLUMN default_monthly_shipments DROP NOT NULL,
  ALTER COLUMN default_max_package_value_usd DROP NOT NULL,
  ALTER COLUMN default_cod_daily_limit_usd DROP NOT NULL;

ALTER TABLE platform_settings
  ADD CONSTRAINT platform_settings_pickup_fee_amount_check
    CHECK (pickup_fee_amount > 0),
  ADD CONSTRAINT platform_settings_pickup_fee_currency_check
    CHECK (char_length(trim(pickup_fee_currency)) = 3),
  ADD CONSTRAINT platform_settings_default_daily_shipments_check
    CHECK (default_daily_shipments IS NULL OR default_daily_shipments >= 1),
  ADD CONSTRAINT platform_settings_default_monthly_shipments_check
    CHECK (default_monthly_shipments IS NULL OR default_monthly_shipments >= 1),
  ADD CONSTRAINT platform_settings_default_max_package_value_usd_check
    CHECK (default_max_package_value_usd IS NULL OR default_max_package_value_usd > 0),
  ADD CONSTRAINT platform_settings_default_cod_daily_limit_usd_check
    CHECK (default_cod_daily_limit_usd IS NULL OR default_cod_daily_limit_usd > 0);

-- ---------------------------------------------------------------------------
-- business_limits: nullable caps
-- ---------------------------------------------------------------------------
ALTER TABLE business_limits
  ALTER COLUMN daily_shipments DROP NOT NULL,
  ALTER COLUMN monthly_shipments DROP NOT NULL,
  ALTER COLUMN max_package_value_usd DROP NOT NULL,
  ALTER COLUMN cod_daily_limit_usd DROP NOT NULL;

ALTER TABLE business_limits
  DROP CONSTRAINT IF EXISTS business_limits_daily_shipments_check,
  DROP CONSTRAINT IF EXISTS business_limits_monthly_shipments_check,
  DROP CONSTRAINT IF EXISTS business_limits_max_package_value_usd_check,
  DROP CONSTRAINT IF EXISTS business_limits_cod_daily_limit_usd_check;

ALTER TABLE business_limits
  ADD CONSTRAINT business_limits_daily_shipments_check
    CHECK (daily_shipments IS NULL OR daily_shipments >= 1),
  ADD CONSTRAINT business_limits_monthly_shipments_check
    CHECK (monthly_shipments IS NULL OR monthly_shipments >= 1),
  ADD CONSTRAINT business_limits_max_package_value_usd_check
    CHECK (max_package_value_usd IS NULL OR max_package_value_usd > 0),
  ADD CONSTRAINT business_limits_cod_daily_limit_usd_check
    CHECK (cod_daily_limit_usd IS NULL OR cod_daily_limit_usd > 0);

-- ---------------------------------------------------------------------------
-- delivery_pricing_rules: currency + currency-agnostic amounts
-- ---------------------------------------------------------------------------
ALTER TABLE delivery_pricing_rules
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CDF';

ALTER TABLE delivery_pricing_rules
  DROP CONSTRAINT IF EXISTS delivery_pricing_rules_currency_check;

ALTER TABLE delivery_pricing_rules
  ADD CONSTRAINT delivery_pricing_rules_currency_check
    CHECK (currency IN ('USD', 'CDF'));

ALTER TABLE delivery_pricing_rules
  ADD COLUMN IF NOT EXISTS below_threshold_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS above_threshold_amount NUMERIC(12, 2);

UPDATE delivery_pricing_rules
SET below_threshold_amount = below_threshold_amount_fc,
    above_threshold_amount = above_threshold_amount_fc
WHERE below_threshold_amount IS NULL OR above_threshold_amount IS NULL;

ALTER TABLE delivery_pricing_rules
  ALTER COLUMN below_threshold_amount SET DEFAULT 1500,
  ALTER COLUMN above_threshold_amount SET DEFAULT 3000,
  ALTER COLUMN below_threshold_amount SET NOT NULL,
  ALTER COLUMN above_threshold_amount SET NOT NULL;

ALTER TABLE delivery_pricing_rules
  DROP COLUMN IF EXISTS below_threshold_amount_fc,
  DROP COLUMN IF EXISTS above_threshold_amount_fc;

-- ---------------------------------------------------------------------------
-- parcels: fee amount + currency
-- ---------------------------------------------------------------------------
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS delivery_fee_currency TEXT NOT NULL DEFAULT 'CDF';

ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_delivery_fee_currency_check;

ALTER TABLE parcels
  ADD CONSTRAINT parcels_delivery_fee_currency_check
    CHECK (delivery_fee_currency IN ('USD', 'CDF'));

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS delivery_fee_amount NUMERIC(12, 2);

UPDATE parcels
SET delivery_fee_amount = delivery_fee_fc
WHERE delivery_fee_amount IS NULL AND delivery_fee_fc IS NOT NULL;

ALTER TABLE parcels
  DROP COLUMN IF EXISTS delivery_fee_fc;
