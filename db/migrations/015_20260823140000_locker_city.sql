ALTER TABLE "lockers"
  ADD COLUMN IF NOT EXISTS "city" TEXT;

UPDATE "lockers" AS l
SET "city" = matched.city
FROM (
  SELECT DISTINCT ON (l2.id)
    l2.id,
    c.city
  FROM "lockers" l2
  CROSS JOIN (
    VALUES
      ('Mwene-Ditu'),
      ('Mbuji-Mayi'),
      ('Lubumbashi'),
      ('Kisangani'),
      ('Kinshasa'),
      ('Mbandaka'),
      ('Tshikapa'),
      ('Kolwezi'),
      ('Kananga'),
      ('Butembo'),
      ('Kalemie'),
      ('Bukavu'),
      ('Likasi'),
      ('Kikwit'),
      ('Matadi'),
      ('Gemena'),
      ('Kindu'),
      ('Isiro'),
      ('Uvira'),
      ('Bunia'),
      ('Boma'),
      ('Goma')
  ) AS c(city)
  WHERE l2.city IS NULL
    AND (
      l2.address ILIKE '%' || c.city || '%'
      OR l2.name ILIKE '%' || c.city || '%'
    )
  ORDER BY l2.id, char_length(c.city) DESC
) AS matched
WHERE l.id = matched.id;

CREATE INDEX IF NOT EXISTS "lockers_city_idx"
  ON "lockers" ("city")
  WHERE "archived_at" IS NULL;
