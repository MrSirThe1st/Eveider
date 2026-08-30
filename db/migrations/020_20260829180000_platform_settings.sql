-- Singleton platform-wide policy (pickup fee, org signup defaults, support contact).

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 5.00
    CHECK (pickup_fee_amount > 0),
  pickup_fee_currency TEXT NOT NULL DEFAULT 'USD'
    CHECK (char_length(trim(pickup_fee_currency)) = 3),
  require_org_approval BOOLEAN NOT NULL DEFAULT FALSE,
  default_daily_shipments INTEGER NOT NULL DEFAULT 50
    CHECK (default_daily_shipments >= 1),
  default_monthly_shipments INTEGER NOT NULL DEFAULT 1000
    CHECK (default_monthly_shipments >= 1),
  default_max_package_value_usd NUMERIC(10, 2) NOT NULL DEFAULT 500.00
    CHECK (default_max_package_value_usd > 0),
  default_cod_daily_limit_usd NUMERIC(10, 2) NOT NULL DEFAULT 200.00
    CHECK (default_cod_daily_limit_usd > 0),
  default_enabled_features JSONB NOT NULL DEFAULT '["CREATE_SHIPMENT","API_ACCESS","COD","MONTHLY_INVOICE"]'::jsonb,
  support_phone TEXT,
  dispatcher_whatsapp TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (
  pickup_fee_amount,
  pickup_fee_currency,
  require_org_approval,
  default_daily_shipments,
  default_monthly_shipments,
  default_max_package_value_usd,
  default_cod_daily_limit_usd,
  default_enabled_features
)
SELECT 5.00, 'USD', FALSE, 50, 1000, 500.00, 200.00,
  '["CREATE_SHIPMENT","API_ACCESS","COD","MONTHLY_INVOICE"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);
