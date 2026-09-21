-- Remember platform staff after access is revoked so they can be reinvited.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "former_platform_role" "PlatformRole",
  ADD COLUMN IF NOT EXISTS "platform_access_revoked_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_former_platform_role_idx"
  ON users ("former_platform_role")
  WHERE "former_platform_role" IS NOT NULL;
