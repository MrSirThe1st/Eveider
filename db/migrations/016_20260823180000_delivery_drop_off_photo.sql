-- Locker drop-off photo proof. Historical completed deliveries remain nullable.
ALTER TABLE "deliveries"
  ADD COLUMN IF NOT EXISTS "drop_off_photo" TEXT;
