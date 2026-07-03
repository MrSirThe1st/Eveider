-- Add locker grid config, archive support, and archived status
ALTER TYPE "LockerStatus" ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE "lockers"
  ADD COLUMN IF NOT EXISTS "rows" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "columns" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- Backfill grid size from existing compartments where possible
UPDATE "lockers" l
SET
  "rows" = COALESCE(sub.row_count, 3),
  "columns" = COALESCE(sub.col_count, 3)
FROM (
  SELECT
    c.locker_id,
    COUNT(DISTINCT LEFT(c.label, 1)) AS row_count,
    MAX(NULLIF(regexp_replace(c.label, '^[A-Z]', '', 'g'), '')::INTEGER) AS col_count
  FROM "compartments" c
  GROUP BY c.locker_id
) sub
WHERE l.id = sub.locker_id;
