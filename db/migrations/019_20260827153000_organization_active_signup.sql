-- Organization signup is immediately operational. KYC is a separate verification
-- record (`business_verifications`) and must not block dashboard or parcels.

ALTER TABLE "businesses"
  ALTER COLUMN "status" SET DEFAULT 'active'::"BusinessStatus";

UPDATE "businesses"
SET "status" = 'active', "updated_at" = NOW()
WHERE "status" IN ('draft', 'onboarding', 'pending_review', 'pending_correction', 'pending');
