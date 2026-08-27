-- Identity remodel: platform roles + organization memberships.
-- Drops users.role / users.user_role / users.business_id.
-- Renames courier → driver for dossiers and delivery assignment.

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "is_platform_org" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_one_platform_org_idx"
  ON "businesses" ("is_platform_org")
  WHERE "is_platform_org" = true;

CREATE TYPE "PlatformRole" AS ENUM ('super_admin', 'admin');
CREATE TYPE "OrganizationRole" AS ENUM ('account_owner', 'admin', 'dispatcher', 'driver');

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "platform_role" "PlatformRole",
  ADD COLUMN IF NOT EXISTS "is_customer" BOOLEAN NOT NULL DEFAULT false;

-- Seeded Eveider organization for internal dispatchers and drivers.
INSERT INTO "businesses" (
  "name", "status", "is_platform_org", "updated_at"
)
SELECT 'Eveider', 'active', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "businesses" WHERE "is_platform_org" = true);

CREATE TABLE "organization_memberships" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "business_id" UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "role" "OrganizationRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_user_business_key" UNIQUE ("user_id", "business_id")
);

CREATE UNIQUE INDEX "organization_memberships_one_owner_idx"
  ON "organization_memberships" ("business_id")
  WHERE "role" = 'account_owner';

CREATE INDEX "organization_memberships_business_idx" ON "organization_memberships" ("business_id");
CREATE INDEX "organization_memberships_user_idx" ON "organization_memberships" ("user_id");
CREATE INDEX "organization_memberships_role_idx" ON "organization_memberships" ("role");

-- Platform staff: first admin is Super Admin, others are Admin
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM "users"
  WHERE "role" = 'admin'
)
UPDATE "users" u
   SET "platform_role" = CASE WHEN ranked.rn = 1 THEN 'super_admin'::"PlatformRole" ELSE 'admin'::"PlatformRole" END
  FROM ranked
 WHERE u.id = ranked.id;
UPDATE "users" SET "is_customer" = true WHERE "role" = 'customer';

-- One account owner per existing business (oldest admin-like member), rest admins/dispatchers
WITH ranked AS (
  SELECT
    u.id,
    u.business_id,
    CASE
      WHEN u.user_role::text IN ('admin', 'owner') OR u.user_role IS NULL THEN 'admin'
      WHEN u.user_role::text IN ('logistics_manager', 'operations_staff', 'manager', 'logistics_employee', 'viewer') THEN 'dispatcher'
      ELSE 'admin'
    END AS mapped_role,
    ROW_NUMBER() OVER (
      PARTITION BY u.business_id
      ORDER BY CASE WHEN u.user_role::text IN ('admin', 'owner') OR u.user_role IS NULL THEN 0 ELSE 1 END, u.created_at ASC
    ) AS rn
  FROM "users" u
  WHERE u.role = 'business' AND u.business_id IS NOT NULL
)
INSERT INTO "organization_memberships" ("user_id", "business_id", "role")
SELECT
  id,
  business_id,
  CASE WHEN rn = 1 THEN 'account_owner'::"OrganizationRole" ELSE mapped_role::"OrganizationRole" END
FROM ranked;

-- Merchant drivers
INSERT INTO "organization_memberships" ("user_id", "business_id", "role")
SELECT u.id, u.business_id, 'driver'
FROM "users" u
WHERE u.role = 'courier' AND u.business_id IS NOT NULL
ON CONFLICT ("user_id", "business_id") DO NOTHING;

-- Eveider fleet drivers + former operators as Eveider dispatchers
INSERT INTO "organization_memberships" ("user_id", "business_id", "role")
SELECT u.id, b.id, 'driver'
FROM "users" u
CROSS JOIN "businesses" b
WHERE b.is_platform_org = true AND u.role = 'courier' AND u.business_id IS NULL
ON CONFLICT ("user_id", "business_id") DO NOTHING;

INSERT INTO "organization_memberships" ("user_id", "business_id", "role")
SELECT u.id, b.id, 'dispatcher'
FROM "users" u
CROSS JOIN "businesses" b
WHERE b.is_platform_org = true AND u.role = 'operator'
ON CONFLICT ("user_id", "business_id") DO NOTHING;

-- Team invites: remap invited_role to organization roles (text then enum)
ALTER TABLE "business_team_invites" ALTER COLUMN "invited_role" TYPE TEXT USING "invited_role"::text;
UPDATE "business_team_invites" SET "invited_role" = CASE
  WHEN "invited_role" IN ('admin', 'owner') THEN 'admin'
  WHEN "invited_role" IN ('logistics_manager', 'operations_staff', 'manager', 'logistics_employee', 'viewer') THEN 'dispatcher'
  ELSE 'dispatcher'
END;

ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "user_role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "business_id";

DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "BusinessUserRole";

ALTER TABLE "business_team_invites"
  ALTER COLUMN "invited_role" TYPE "OrganizationRole"
  USING "invited_role"::"OrganizationRole";

-- Driver dossiers (rename courier_dossiers). contractor_type stays eveider | business in DB.
ALTER TYPE "CourierDossierStatus" RENAME TO "DriverDossierStatus";

ALTER TABLE "courier_dossiers" RENAME TO "driver_dossiers";

ALTER INDEX IF EXISTS "courier_dossiers_email_active_idx" RENAME TO "driver_dossiers_email_active_idx";
ALTER INDEX IF EXISTS "courier_dossiers_status_idx" RENAME TO "driver_dossiers_status_idx";
ALTER INDEX IF EXISTS "courier_dossiers_business_idx" RENAME TO "driver_dossiers_business_idx";
ALTER INDEX IF EXISTS "courier_dossiers_user_idx" RENAME TO "driver_dossiers_user_idx";

ALTER TABLE "deliveries" RENAME COLUMN "courier_id" TO "driver_id";
ALTER INDEX IF EXISTS "deliveries_courier_id_status_idx" RENAME TO "deliveries_driver_id_status_idx";
ALTER TABLE "deliveries" RENAME CONSTRAINT "deliveries_courier_id_fkey" TO "deliveries_driver_id_fkey";
