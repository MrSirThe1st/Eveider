-- Business operational access code (EVB-XXXXXX), visible to admin + business.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_access_code_key
  ON businesses (access_code)
  WHERE access_code IS NOT NULL;
