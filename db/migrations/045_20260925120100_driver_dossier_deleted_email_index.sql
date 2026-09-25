-- Allow reusing emails from deleted driver dossiers.

DROP INDEX IF EXISTS "driver_dossiers_email_active_idx";
CREATE UNIQUE INDEX "driver_dossiers_email_active_idx"
  ON "driver_dossiers" (lower("email"))
  WHERE "status" NOT IN ('rejected', 'deleted');
