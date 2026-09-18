-- Canonical commercial charge kinds. Historical delivery_fee / drop_off_fee remain.
ALTER TYPE "ParcelChargeKind" ADD VALUE IF NOT EXISTS 'outbound_delivery';
ALTER TYPE "ParcelChargeKind" ADD VALUE IF NOT EXISTS 'locker_collection';
ALTER TYPE "ParcelChargeKind" ADD VALUE IF NOT EXISTS 'return_delivery';
ALTER TYPE "ParcelChargeKind" ADD VALUE IF NOT EXISTS 'return_locker';
