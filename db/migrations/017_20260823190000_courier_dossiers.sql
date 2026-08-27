-- Courier contractor dossiers (identity review before Auth) + account closure columns.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE TYPE "CourierContractorType" AS ENUM ('eveider', 'business');

CREATE TYPE "CourierDossierStatus" AS ENUM (
  'pending_review',
  'needs_correction',
  'rejected',
  'approved',
  'invited',
  'active',
  'deactivated'
);

CREATE TABLE "courier_dossiers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contractor_type" "CourierContractorType" NOT NULL,
  "business_id" UUID REFERENCES "businesses"("id") ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "id_document_url" TEXT NOT NULL,
  "notes" TEXT,
  "review_notes" TEXT,
  "status" "CourierDossierStatus" NOT NULL DEFAULT 'pending_review',
  "created_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMP(3),
  "invited_at" TIMESTAMP(3),
  "deactivated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_dossiers_contractor_chk" CHECK (
    ("contractor_type" = 'eveider' AND "business_id" IS NULL)
    OR ("contractor_type" = 'business' AND "business_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "courier_dossiers_email_active_idx"
  ON "courier_dossiers" (lower("email"))
  WHERE "status" NOT IN ('rejected');

CREATE INDEX "courier_dossiers_status_idx" ON "courier_dossiers" ("status");
CREATE INDEX "courier_dossiers_business_idx" ON "courier_dossiers" ("business_id");
CREATE INDEX "courier_dossiers_user_idx" ON "courier_dossiers" ("user_id");
CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at");
CREATE INDEX "users_deactivated_at_idx" ON "users" ("deactivated_at");
