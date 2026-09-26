-- Web notification inbox: typed events, read_at, email preference.
-- sent_at remains channel delivery timestamp (WhatsApp/SMS); in-app read state uses read_at.

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "entity_type" TEXT,
  ADD COLUMN IF NOT EXISTS "entity_id" UUID,
  ADD COLUMN IF NOT EXISTS "business_id" UUID,
  ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT,
  ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_business_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Migrate legacy in_app read flag (sent_at) → read_at, then clear sent_at for in_app rows.
UPDATE "notifications"
SET "read_at" = "sent_at"
WHERE "channel" = 'in_app'
  AND "sent_at" IS NOT NULL
  AND "read_at" IS NULL;

UPDATE "notifications"
SET "sent_at" = NULL
WHERE "channel" = 'in_app';

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_dedupe_key_uidx"
  ON "notifications" ("user_id", "dedupe_key")
  WHERE "dedupe_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "notifications_user_in_app_created_idx"
  ON "notifications" ("user_id", "created_at" DESC)
  WHERE "channel" = 'in_app';

CREATE INDEX IF NOT EXISTS "notifications_user_in_app_unread_idx"
  ON "notifications" ("user_id", "created_at" DESC)
  WHERE "channel" = 'in_app' AND "read_at" IS NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
