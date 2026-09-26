-- Mobile push device registry + global push preference.
-- Push is a delivery channel for the same in_app notification row (no duplicate push rows).

CREATE TABLE IF NOT EXISTS "user_push_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "expo_push_token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "device_id" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_push_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_push_devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_push_devices_platform_check"
    CHECK ("platform" IN ('ios', 'android'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_push_devices_token_uidx"
  ON "user_push_devices" ("expo_push_token");

CREATE UNIQUE INDEX IF NOT EXISTS "user_push_devices_user_device_uidx"
  ON "user_push_devices" ("user_id", "device_id")
  WHERE "device_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "user_push_devices_user_enabled_idx"
  ON "user_push_devices" ("user_id")
  WHERE "enabled" = true;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "push_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
