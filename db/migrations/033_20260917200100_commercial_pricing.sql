-- Zone fees on existing service areas + global Flow 2 / 3B amounts + charge payer snapshot.

ALTER TABLE service_areas
  ADD COLUMN IF NOT EXISTS outbound_delivery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_delivery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE service_areas
  DROP CONSTRAINT IF EXISTS service_areas_outbound_delivery_amount_check,
  DROP CONSTRAINT IF EXISTS service_areas_return_delivery_amount_check;

ALTER TABLE service_areas
  ADD CONSTRAINT service_areas_outbound_delivery_amount_check
    CHECK (outbound_delivery_amount >= 0),
  ADD CONSTRAINT service_areas_return_delivery_amount_check
    CHECK (return_delivery_amount >= 0);

ALTER TABLE delivery_pricing_rules
  ADD COLUMN IF NOT EXISTS locker_collection_amount NUMERIC(12, 2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS return_locker_amount NUMERIC(12, 2) NOT NULL DEFAULT 500;

ALTER TABLE delivery_pricing_rules
  DROP CONSTRAINT IF EXISTS delivery_pricing_rules_locker_collection_amount_check,
  DROP CONSTRAINT IF EXISTS delivery_pricing_rules_return_locker_amount_check;

ALTER TABLE delivery_pricing_rules
  ADD CONSTRAINT delivery_pricing_rules_locker_collection_amount_check
    CHECK (locker_collection_amount >= 0),
  ADD CONSTRAINT delivery_pricing_rules_return_locker_amount_check
    CHECK (return_locker_amount >= 0);

UPDATE delivery_pricing_rules
SET locker_collection_amount = drop_off_fee_amount
WHERE locker_collection_amount = 500;

ALTER TABLE parcel_charges
  ADD COLUMN IF NOT EXISTS payer TEXT NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS pricing_zone_id UUID;

ALTER TABLE parcel_charges
  DROP CONSTRAINT IF EXISTS parcel_charges_payer_check;

ALTER TABLE parcel_charges
  ADD CONSTRAINT parcel_charges_payer_check
    CHECK (payer IN ('recipient', 'business'));

ALTER TABLE parcel_charges
  DROP CONSTRAINT IF EXISTS parcel_charges_pricing_zone_id_fkey;

ALTER TABLE parcel_charges
  ADD CONSTRAINT parcel_charges_pricing_zone_id_fkey
  FOREIGN KEY (pricing_zone_id) REFERENCES service_areas(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- One live snapshot per parcel + kind. Retries must not create a second amount.
CREATE UNIQUE INDEX IF NOT EXISTS parcel_charges_parcel_kind_active_uidx
  ON parcel_charges (parcel_id, kind)
  WHERE status <> 'void';
