-- Delivery direction: outbound (merchant→locker) vs return (locker→merchant).

CREATE TYPE "DeliveryKind" AS ENUM ('outbound', 'return');

ALTER TABLE "deliveries"
  ADD COLUMN "kind" "DeliveryKind" NOT NULL DEFAULT 'outbound';

CREATE INDEX "deliveries_kind_idx" ON "deliveries" ("kind");
