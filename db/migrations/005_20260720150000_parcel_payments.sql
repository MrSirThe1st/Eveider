-- Parcel pickup payments (PawaPay mobile money)
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE "parcel_payments" (
    "id" UUID NOT NULL,
    "parcel_id" UUID NOT NULL,
    "user_id" UUID,
    "deposit_id" UUID NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "pawapay_status" TEXT,
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parcel_payments_deposit_id_key" ON "parcel_payments"("deposit_id");
CREATE INDEX "parcel_payments_parcel_id_status_idx" ON "parcel_payments"("parcel_id", "status");
CREATE INDEX "parcel_payments_status_idx" ON "parcel_payments"("status");

ALTER TABLE "parcel_payments" ADD CONSTRAINT "parcel_payments_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parcel_payments" ADD CONSTRAINT "parcel_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
