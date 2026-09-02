-- Organisation API keys and outbound software notifications.

CREATE TABLE "organization_api_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Clé principale',
  "key_prefix" TEXT NOT NULL,
  "secret_hash" TEXT NOT NULL,
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_api_keys_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organization_api_keys"
  ADD CONSTRAINT "organization_api_keys_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "organization_api_keys_business_id_idx"
  ON "organization_api_keys" ("business_id");

CREATE UNIQUE INDEX "organization_api_keys_secret_hash_active_idx"
  ON "organization_api_keys" ("secret_hash")
  WHERE "revoked_at" IS NULL;

CREATE TABLE "organization_notification_endpoints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "url" TEXT,
  "signing_secret" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_notification_endpoints_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organization_notification_endpoints"
  ADD CONSTRAINT "organization_notification_endpoints_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "organization_notification_endpoints_business_id_idx"
  ON "organization_notification_endpoints" ("business_id");

CREATE TABLE "organization_notification_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "endpoint_id" UUID NOT NULL,
  "parcel_id" UUID,
  "event_id" UUID,
  "event_type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "http_status" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_notification_deliveries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organization_notification_deliveries"
  ADD CONSTRAINT "organization_notification_deliveries_endpoint_id_fkey"
  FOREIGN KEY ("endpoint_id") REFERENCES "organization_notification_endpoints"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "organization_notification_deliveries_endpoint_id_idx"
  ON "organization_notification_deliveries" ("endpoint_id", "created_at" DESC);
