-- Prisma previously generated UUIDs / timestamps in the client.
-- Hand-written SQL inserts omit id/updated_at, so Postgres needs defaults.

ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "businesses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "businesses" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "lockers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "lockers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "compartments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "compartments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "parcels" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "parcels" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "deliveries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "deliveries" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "pickup_pins" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "issues" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "issues" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "parcel_invites" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "parcel_invites" ALTER COLUMN "token" SET DEFAULT gen_random_uuid();

ALTER TABLE "parcel_payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "parcel_payments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
