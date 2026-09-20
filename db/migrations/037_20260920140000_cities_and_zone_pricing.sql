-- City parent entity + zone_pricing. service_areas remains the Zone table.
-- Existing KIN / LSH / KWZ UUIDs are unchanged (city-wide holding zones).
-- Historical parcel_charges are not modified.

DO $$ BEGIN
  CREATE TYPE "CityStatus" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status "CityStatus" NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cities_code_key ON cities (lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS cities_name_key ON cities (lower(name));
CREATE INDEX IF NOT EXISTS cities_status_idx ON cities (status);

INSERT INTO cities (code, name, status)
VALUES
  ('BOM', 'Boma', 'active'),
  ('BKV', 'Bukavu', 'active'),
  ('BUN', 'Bunia', 'active'),
  ('BTB', 'Butembo', 'active'),
  ('GEM', 'Gemena', 'active'),
  ('GOM', 'Goma', 'active'),
  ('ISI', 'Isiro', 'active'),
  ('KAL', 'Kalemie', 'active'),
  ('KNG', 'Kananga', 'active'),
  ('KKW', 'Kikwit', 'active'),
  ('KND', 'Kindu', 'active'),
  ('KIN', 'Kinshasa', 'active'),
  ('KIS', 'Kisangani', 'active'),
  ('KWZ', 'Kolwezi', 'active'),
  ('LKS', 'Likasi', 'active'),
  ('LSH', 'Lubumbashi', 'active'),
  ('MAT', 'Matadi', 'active'),
  ('MBA', 'Mbandaka', 'active'),
  ('MBM', 'Mbuji-Mayi', 'active'),
  ('MWD', 'Mwene-Ditu', 'active'),
  ('TSH', 'Tshikapa', 'active'),
  ('UVI', 'Uvira', 'active')
ON CONFLICT (lower(code)) DO NOTHING;

ALTER TABLE service_areas
  ADD COLUMN IF NOT EXISTS city_id UUID;

UPDATE service_areas sa
SET city_id = c.id
FROM cities c
WHERE sa.city_id IS NULL
  AND lower(sa.city) = lower(c.name);

DO $$
DECLARE
  unmapped INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped FROM service_areas WHERE city_id IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'SERVICE_AREA_CITY_UNMAPPED: % service_areas could not be mapped to cities', unmapped;
  END IF;
END $$;

ALTER TABLE service_areas
  ALTER COLUMN city_id SET NOT NULL;

ALTER TABLE service_areas
  DROP CONSTRAINT IF EXISTS service_areas_city_id_fkey;

ALTER TABLE service_areas
  ADD CONSTRAINT service_areas_city_id_fkey
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS service_areas_city_id_idx ON service_areas (city_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_areas_city_id_name_key ON service_areas (city_id, lower(name));

CREATE TABLE IF NOT EXISTS zone_pricing (
  zone_id UUID PRIMARY KEY,
  outbound_delivery_amount NUMERIC(12, 2),
  return_delivery_amount NUMERIC(12, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT zone_pricing_outbound_delivery_amount_check
    CHECK (outbound_delivery_amount IS NULL OR outbound_delivery_amount >= 0),
  CONSTRAINT zone_pricing_return_delivery_amount_check
    CHECK (return_delivery_amount IS NULL OR return_delivery_amount >= 0),
  CONSTRAINT zone_pricing_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES service_areas(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT zone_pricing_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Existing amounts, including explicit 0, are configured.
INSERT INTO zone_pricing (zone_id, outbound_delivery_amount, return_delivery_amount, updated_at)
SELECT id, outbound_delivery_amount, return_delivery_amount, NOW()
FROM service_areas
ON CONFLICT (zone_id) DO NOTHING;

-- Keep lockers on their current service_area_id. Only fill NULL SMART_LOCKER
-- rows when the city has exactly one active zone (the holding zone).
UPDATE lockers l
SET service_area_id = sa.id,
    updated_at = NOW()
FROM service_areas sa
JOIN cities c ON c.id = sa.city_id
WHERE l.service_area_id IS NULL
  AND l.type = 'SMART_LOCKER'
  AND l.city IS NOT NULL
  AND lower(l.city) = lower(c.name)
  AND sa.status = 'active'
  AND (
    SELECT COUNT(*)::int FROM service_areas sa2
    WHERE sa2.city_id = c.id AND sa2.status = 'active'
  ) = 1;

ALTER TABLE lockers
  DROP CONSTRAINT IF EXISTS lockers_service_area_id_fkey;

ALTER TABLE lockers
  ADD CONSTRAINT lockers_service_area_id_fkey
  FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE lockers
  DROP CONSTRAINT IF EXISTS lockers_active_smart_requires_zone_chk;

ALTER TABLE lockers
  ADD CONSTRAINT lockers_active_smart_requires_zone_chk
  CHECK (
    NOT (
      type = 'SMART_LOCKER'
      AND status <> 'archived'
      AND archived_at IS NULL
      AND service_area_id IS NULL
    )
  );

CREATE OR REPLACE FUNCTION forbid_archive_zone_with_active_lockers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    IF EXISTS (
      SELECT 1 FROM lockers
      WHERE service_area_id = NEW.id
        AND type = 'SMART_LOCKER'
        AND status <> 'archived'
        AND archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'ZONE_HAS_ACTIVE_LOCKERS'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_areas_forbid_archive_with_lockers ON service_areas;
CREATE TRIGGER service_areas_forbid_archive_with_lockers
  BEFORE UPDATE OF status ON service_areas
  FOR EACH ROW
  EXECUTE FUNCTION forbid_archive_zone_with_active_lockers();

CREATE OR REPLACE FUNCTION forbid_archive_city_with_active_zones()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    IF EXISTS (
      SELECT 1 FROM service_areas
      WHERE city_id = NEW.id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'CITY_HAS_ACTIVE_ZONES'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cities_forbid_archive_with_zones ON cities;
CREATE TRIGGER cities_forbid_archive_with_zones
  BEFORE UPDATE OF status ON cities
  FOR EACH ROW
  EXECUTE FUNCTION forbid_archive_city_with_active_zones();
