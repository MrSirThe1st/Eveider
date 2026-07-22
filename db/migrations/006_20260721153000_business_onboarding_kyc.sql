-- 1. Create Enums
CREATE TYPE "BusinessType" AS ENUM ('registered_company', 'individual_seller', 'marketplace', 'enterprise_partner');
CREATE TYPE "BusinessUserRole" AS ENUM ('owner', 'manager', 'logistics_employee');
CREATE TYPE "RiskClassification" AS ENUM ('registered_business', 'individual_seller');
CREATE TYPE "DocumentType" AS ENUM ('rccm_certificate', 'nif_certificate', 'legal_rep_id', 'national_id', 'selfie', 'business_license', 'proof_of_address');
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'approved', 'rejected', 'correction_requested');
CREATE TYPE "LocationType" AS ENUM ('business_address', 'warehouse', 'pickup_point');
CREATE TYPE "PickupMethod" AS ENUM ('courier_pickup', 'merchant_dropoff');
CREATE TYPE "DeliveryPaymentRule" AS ENUM ('merchant_pays', 'customer_pays', 'depends_on_order');
CREATE TYPE "SettlementMethod" AS ENUM ('mobile_money_airtel', 'mobile_money_orange', 'mobile_money_mpesa', 'bank_transfer');
CREATE TYPE "BillingType" AS ENUM ('pay_per_shipment', 'monthly_invoice');
CREATE TYPE "CheckType" AS ENUM ('PHONE_VERIFIED', 'IDENTITY_MATCHED', 'DOCUMENT_VALID', 'ADDRESS_CONFIRMED', 'COMPANY_REGISTERED', 'BANK_ACCOUNT_VERIFIED');
CREATE TYPE "CheckStatus" AS ENUM ('PASS', 'FAIL', 'PENDING');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected', 'correction_requested');
CREATE TYPE "FeatureName" AS ENUM ('CREATE_SHIPMENT', 'API_ACCESS', 'COD', 'MONTHLY_INVOICE');
CREATE TYPE "PermissionStatus" AS ENUM ('ENABLED', 'DISABLED');

-- 2. Alter Enum BusinessStatus
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'pending_correction';
COMMIT;

-- 3. Alter Table users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_role" "BusinessUserRole";

-- 4. Alter Table businesses
ALTER TABLE "businesses"
  ALTER COLUMN "status" SET DEFAULT 'onboarding'::"BusinessStatus",
  ADD COLUMN IF NOT EXISTS "business_type" "BusinessType",
  ADD COLUMN IF NOT EXISTS "industry" TEXT,
  ADD COLUMN IF NOT EXISTS "sales_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "risk_classification" "RiskClassification",
  ADD COLUMN IF NOT EXISTS "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "otp_code" TEXT,
  ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "legal_company_name" TEXT,
  ADD COLUMN IF NOT EXISTS "rccm_number" TEXT,
  ADD COLUMN IF NOT EXISTS "nif_number" TEXT,
  ADD COLUMN IF NOT EXISTS "date_created" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "legal_rep_name" TEXT,
  ADD COLUMN IF NOT EXISTS "individual_full_name" TEXT,
  ADD COLUMN IF NOT EXISTS "id_passport_number" TEXT,
  ADD COLUMN IF NOT EXISTS "residential_address" TEXT;

-- 5. Create Table business_verifications
CREATE TABLE IF NOT EXISTS "business_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_verifications_pkey" PRIMARY KEY ("id")
);

-- 6. Create Table verification_checks
CREATE TABLE IF NOT EXISTS "verification_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_verification_id" UUID NOT NULL,
    "type" "CheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_checks_pkey" PRIMARY KEY ("id")
);

-- 7. Create Table business_documents
CREATE TABLE IF NOT EXISTS "business_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_documents_pkey" PRIMARY KEY ("id")
);

-- 8. Create Table business_locations
CREATE TABLE IF NOT EXISTS "business_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'business_address',
    "pickup_method" "PickupMethod" NOT NULL DEFAULT 'courier_pickup',
    "country" TEXT NOT NULL DEFAULT 'RDC',
    "city" TEXT NOT NULL DEFAULT 'Kinshasa',
    "street" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "available_days" TEXT,
    "available_hours" TEXT,
    "dropoff_locker_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- 9. Create Table billing_accounts
CREATE TABLE IF NOT EXISTS "billing_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "payment_rule" "DeliveryPaymentRule" NOT NULL DEFAULT 'merchant_pays',
    "billing_type" "BillingType" NOT NULL DEFAULT 'pay_per_shipment',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- 10. Create Table settlement_accounts
CREATE TABLE IF NOT EXISTS "settlement_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "payout_method" "SettlementMethod" NOT NULL DEFAULT 'mobile_money_orange',
    "account_holder" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_accounts_pkey" PRIMARY KEY ("id")
);

-- 11. Create Table business_permissions
CREATE TABLE IF NOT EXISTS "business_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "feature" "FeatureName" NOT NULL,
    "status" "PermissionStatus" NOT NULL DEFAULT 'ENABLED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_permissions_pkey" PRIMARY KEY ("id")
);

-- 12. Create Table business_limits
CREATE TABLE IF NOT EXISTS "business_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "daily_shipments" INTEGER NOT NULL DEFAULT 50,
    "monthly_shipments" INTEGER NOT NULL DEFAULT 1000,
    "max_package_value_usd" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "cod_daily_limit_usd" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_limits_pkey" PRIMARY KEY ("id")
);

-- 13. Create Table business_status_histories
CREATE TABLE IF NOT EXISTS "business_status_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "previous_status" "BusinessStatus" NOT NULL,
    "new_status" "BusinessStatus" NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_status_histories_pkey" PRIMARY KEY ("id")
);

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "billing_accounts_business_id_key" ON "billing_accounts"("business_id");
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_accounts_business_id_key" ON "settlement_accounts"("business_id");
CREATE UNIQUE INDEX IF NOT EXISTS "business_permissions_business_id_feature_key" ON "business_permissions"("business_id", "feature");
CREATE UNIQUE INDEX IF NOT EXISTS "business_limits_business_id_key" ON "business_limits"("business_id");

CREATE INDEX IF NOT EXISTS "business_verifications_business_id_idx" ON "business_verifications"("business_id");
CREATE INDEX IF NOT EXISTS "verification_checks_business_verification_id_idx" ON "verification_checks"("business_verification_id");
CREATE INDEX IF NOT EXISTS "business_documents_business_id_idx" ON "business_documents"("business_id");
CREATE INDEX IF NOT EXISTS "business_locations_business_id_idx" ON "business_locations"("business_id");
CREATE INDEX IF NOT EXISTS "business_permissions_business_id_idx" ON "business_permissions"("business_id");
CREATE INDEX IF NOT EXISTS "business_status_histories_business_id_idx" ON "business_status_histories"("business_id");

-- Foreign Keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_verifications_business_id_fkey') THEN
    ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_verifications_reviewer_id_fkey') THEN
    ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verification_checks_business_verification_id_fkey') THEN
    ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_business_verification_id_fkey" FOREIGN KEY ("business_verification_id") REFERENCES "business_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_documents_business_id_fkey') THEN
    ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_locations_business_id_fkey') THEN
    ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_locations_dropoff_locker_id_fkey') THEN
    ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_dropoff_locker_id_fkey" FOREIGN KEY ("dropoff_locker_id") REFERENCES "lockers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_accounts_business_id_fkey') THEN
    ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settlement_accounts_business_id_fkey') THEN
    ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_permissions_business_id_fkey') THEN
    ALTER TABLE "business_permissions" ADD CONSTRAINT "business_permissions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_limits_business_id_fkey') THEN
    ALTER TABLE "business_limits" ADD CONSTRAINT "business_limits_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_status_histories_business_id_fkey') THEN
    ALTER TABLE "business_status_histories" ADD CONSTRAINT "business_status_histories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
