-- Business drivers no longer wait for Eveider KYC before becoming operational.
-- Documents remain on file; promote existing review-state business dossiers.
UPDATE "driver_dossiers"
SET
  "status" = CASE
    WHEN "user_id" IS NOT NULL THEN 'active'::"DriverDossierStatus"
    WHEN "invited_at" IS NOT NULL THEN 'invited'::"DriverDossierStatus"
    ELSE 'approved'::"DriverDossierStatus"
  END,
  "updated_at" = NOW()
WHERE "contractor_type" = 'business'
  AND "status" IN ('pending_review'::"DriverDossierStatus", 'needs_correction'::"DriverDossierStatus");
