-- Platform administrator invitations (platform_role super_admin | admin).

CREATE TABLE "platform_admin_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "token" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "invited_role" "PlatformRole" NOT NULL,
  "invited_by_user_id" UUID,
  "status" "BusinessTeamInviteStatus" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "accepted_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admin_invites_token_key" ON "platform_admin_invites"("token");
CREATE INDEX "platform_admin_invites_status_idx" ON "platform_admin_invites"("status");
CREATE UNIQUE INDEX "platform_admin_invites_pending_email_key"
  ON "platform_admin_invites" (lower("email"))
  WHERE "status" = 'pending';

ALTER TABLE "platform_admin_invites"
  ADD CONSTRAINT "platform_admin_invites_invited_by_user_id_fkey"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_admin_invites"
  ADD CONSTRAINT "platform_admin_invites_accepted_user_id_fkey"
  FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
