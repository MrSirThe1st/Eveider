-- DRC geographic catalog (province → city) vs Eveider operating cities.
-- Operating `cities` stay the network table. Catalog cities are not activated until Admin selects them.
-- Existing KIN / LSH / KWZ city and holding-zone UUIDs are unchanged.

CREATE TABLE IF NOT EXISTS drc_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS drc_provinces_name_key ON drc_provinces (lower(name));

CREATE TABLE IF NOT EXISTS drc_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT drc_cities_province_id_fkey
    FOREIGN KEY (province_id) REFERENCES drc_provinces(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS drc_cities_name_key ON drc_cities (lower(name));
CREATE INDEX IF NOT EXISTS drc_cities_province_id_idx ON drc_cities (province_id);

INSERT INTO drc_provinces (name)
VALUES
  ('Kinshasa'),
  ('Kongo Central'),
  ('Kwango'),
  ('Kwilu'),
  ('Mai-Ndombe'),
  ('Kasaï'),
  ('Kasaï-Central'),
  ('Kasaï-Oriental'),
  ('Lomami'),
  ('Sankuru'),
  ('Équateur'),
  ('Mongala'),
  ('Nord-Ubangi'),
  ('Sud-Ubangi'),
  ('Tshuapa'),
  ('Tshopo'),
  ('Bas-Uélé'),
  ('Haut-Uélé'),
  ('Ituri'),
  ('Nord-Kivu'),
  ('Sud-Kivu'),
  ('Maniema'),
  ('Haut-Katanga'),
  ('Haut-Lomami'),
  ('Lualaba'),
  ('Tanganyika')
ON CONFLICT (lower(name)) DO NOTHING;

INSERT INTO drc_cities (province_id, name)
SELECT p.id, v.name
FROM drc_provinces p
JOIN (
  VALUES
    ('Kinshasa', 'Kinshasa'),
    ('Kongo Central', 'Matadi'),
    ('Kongo Central', 'Boma'),
    ('Kongo Central', 'Muanda'),
    ('Kwango', 'Kenge'),
    ('Kwango', 'Popokabaka'),
    ('Kwilu', 'Bandundu'),
    ('Kwilu', 'Kikwit'),
    ('Kwilu', 'Idiofa'),
    ('Mai-Ndombe', 'Inongo'),
    ('Mai-Ndombe', 'Nioki'),
    ('Kasaï', 'Tshikapa'),
    ('Kasaï', 'Luebo'),
    ('Kasaï-Central', 'Kananga'),
    ('Kasaï-Oriental', 'Mbuji-Mayi'),
    ('Lomami', 'Kabinda'),
    ('Lomami', 'Mwene-Ditu'),
    ('Sankuru', 'Lusambo'),
    ('Équateur', 'Mbandaka'),
    ('Mongala', 'Lisala'),
    ('Mongala', 'Bumba'),
    ('Nord-Ubangi', 'Gbadolite'),
    ('Sud-Ubangi', 'Gemena'),
    ('Sud-Ubangi', 'Zongo'),
    ('Tshuapa', 'Boende'),
    ('Tshopo', 'Kisangani'),
    ('Bas-Uélé', 'Buta'),
    ('Bas-Uélé', 'Bondo'),
    ('Haut-Uélé', 'Isiro'),
    ('Haut-Uélé', 'Watsa'),
    ('Ituri', 'Bunia'),
    ('Nord-Kivu', 'Goma'),
    ('Nord-Kivu', 'Beni'),
    ('Nord-Kivu', 'Butembo'),
    ('Sud-Kivu', 'Bukavu'),
    ('Sud-Kivu', 'Uvira'),
    ('Maniema', 'Kindu'),
    ('Haut-Katanga', 'Lubumbashi'),
    ('Haut-Katanga', 'Likasi'),
    ('Haut-Katanga', 'Kasumbalesa'),
    ('Haut-Lomami', 'Kamina'),
    ('Lualaba', 'Kolwezi'),
    ('Tanganyika', 'Kalemie')
) AS v(province, name) ON v.province = p.name
ON CONFLICT (lower(name)) DO NOTHING;

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS drc_city_id UUID;

ALTER TABLE cities
  DROP CONSTRAINT IF EXISTS cities_drc_city_id_fkey;

ALTER TABLE cities
  ADD CONSTRAINT cities_drc_city_id_fkey
  FOREIGN KEY (drc_city_id) REFERENCES drc_cities(id) ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE cities c
SET drc_city_id = dc.id
FROM drc_cities dc
WHERE c.drc_city_id IS NULL
  AND lower(c.name) = lower(dc.name);

-- Catalog cities are not operating cities. Drop unused preloaded rows (no zones, no lockers).
DELETE FROM cities c
WHERE NOT EXISTS (SELECT 1 FROM service_areas sa WHERE sa.city_id = c.id)
  AND NOT EXISTS (
    SELECT 1 FROM lockers l
    WHERE l.city IS NOT NULL
      AND lower(l.city) = lower(c.name)
      AND l.archived_at IS NULL
      AND l.status <> 'archived'
  );

CREATE UNIQUE INDEX IF NOT EXISTS cities_drc_city_id_key
  ON cities (drc_city_id)
  WHERE drc_city_id IS NOT NULL;

ALTER TABLE service_areas
  ADD COLUMN IF NOT EXISTS is_holding BOOLEAN NOT NULL DEFAULT false;

UPDATE service_areas
SET is_holding = true
WHERE code IN ('KIN', 'LSH', 'KWZ');

-- One holding zone per remaining operating city (keep existing KIN/LSH/KWZ rows).
INSERT INTO service_areas (code, name, city, city_id, status, is_holding)
SELECT
  'EVZ' || upper(substr(replace(c.id::text, '-', ''), 1, 8)),
  c.name,
  c.name,
  c.id,
  'active',
  true
FROM cities c
WHERE NOT EXISTS (
  SELECT 1 FROM service_areas sa
  WHERE sa.city_id = c.id AND sa.is_holding
);

INSERT INTO zone_pricing (zone_id, outbound_delivery_amount, return_delivery_amount, updated_at)
SELECT sa.id, NULL, NULL, NOW()
FROM service_areas sa
LEFT JOIN zone_pricing zp ON zp.zone_id = sa.id
WHERE zp.zone_id IS NULL
ON CONFLICT (zone_id) DO NOTHING;
