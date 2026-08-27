-- Company membership roles (users.user_role) + team invitations.
-- Platform users.role stays unchanged: business vs admin/operator.

ALTER TABLE "users" ALTER COLUMN "user_role" TYPE TEXT USING "user_role"::text;

UPDATE "users" SET "user_role" = CASE
  WHEN "user_role" = 'owner' THEN 'admin'
  WHEN "user_role" = 'manager' THEN 'logistics_manager'
  WHEN "user_role" = 'logistics_employee' THEN 'operations_staff'
  ELSE "user_role"
END;

UPDATE "users"
   SET "user_role" = 'admin'
 WHERE "role" = 'business' AND "user_role" IS NULL;

DROP TYPE IF EXISTS "BusinessUserRole";

CREATE TYPE "BusinessUserRole" AS ENUM (
  'admin',
  'logistics_manager',
  'operations_staff',
  'viewer'
);

ALTER TABLE "users"
  ALTER COLUMN "user_role" TYPE "BusinessUserRole"
  USING "user_role"::"BusinessUserRole";

CREATE TYPE "BusinessTeamInviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE "business_team_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "token" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "invited_role" "BusinessUserRole" NOT NULL,
  "invited_by_user_id" UUID,
  "status" "BusinessTeamInviteStatus" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "accepted_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_team_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_team_invites_token_key" ON "business_team_invites"("token");
CREATE INDEX "business_team_invites_business_id_idx" ON "business_team_invites"("business_id");
CREATE INDEX "business_team_invites_status_idx" ON "business_team_invites"("status");
CREATE UNIQUE INDEX "business_team_invites_pending_email_key"
  ON "business_team_invites" ("business_id", lower("email"))
  WHERE "status" = 'pending';

ALTER TABLE "business_team_invites"
  ADD CONSTRAINT "business_team_invites_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_team_invites"
  ADD CONSTRAINT "business_team_invites_invited_by_user_id_fkey"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_team_invites"
  ADD CONSTRAINT "business_team_invites_accepted_user_id_fkey"
  FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
