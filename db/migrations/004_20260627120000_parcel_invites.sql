-- CreateEnum
CREATE TYPE "ParcelInviteStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateTable
CREATE TABLE "parcel_invites" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "parcel_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "ParcelInviteStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcel_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parcel_invites_token_key" ON "parcel_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_invites_parcel_id_key" ON "parcel_invites"("parcel_id");

-- CreateIndex
CREATE INDEX "parcel_invites_phone_idx" ON "parcel_invites"("phone");

-- CreateIndex
CREATE INDEX "parcel_invites_status_idx" ON "parcel_invites"("status");

-- AddForeignKey
ALTER TABLE "parcel_invites" ADD CONSTRAINT "parcel_invites_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
