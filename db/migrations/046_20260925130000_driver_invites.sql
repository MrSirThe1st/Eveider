-- Driver invitations (password signup), same pattern as platform_admin_invites / business_team_invites.

CREATE TABLE "driver_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "token" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dossier_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "invited_by_user_id" UUID,
  "status" "BusinessTeamInviteStatus" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "accepted_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_invites_token_key" ON "driver_invites"("token");
CREATE INDEX "driver_invites_dossier_id_idx" ON "driver_invites"("dossier_id");
CREATE INDEX "driver_invites_status_idx" ON "driver_invites"("status");
CREATE UNIQUE INDEX "driver_invites_pending_dossier_key"
  ON "driver_invites" ("dossier_id")
  WHERE "status" = 'pending';

ALTER TABLE "driver_invites"
  ADD CONSTRAINT "driver_invites_dossier_id_fkey"
  FOREIGN KEY ("dossier_id") REFERENCES "driver_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "driver_invites"
  ADD CONSTRAINT "driver_invites_invited_by_user_id_fkey"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "driver_invites"
  ADD CONSTRAINT "driver_invites_accepted_user_id_fkey"
  FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
