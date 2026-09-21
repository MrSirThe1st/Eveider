-- Optional vehicle files on a chauffeur dossier (carte grise, assurance, …).
-- Stored like identity pieces in the private identity-documents bucket.

CREATE TABLE "driver_vehicle_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "driver_dossier_id" UUID NOT NULL REFERENCES "driver_dossiers"("id") ON DELETE CASCADE,
  "stored_ref" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "uploaded_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "driver_vehicle_documents_dossier_idx"
  ON "driver_vehicle_documents" ("driver_dossier_id", "created_at");
