-- Driver ops V1: assignment gates, deadlines, instructions,
-- driver accepting-work flag, vehicle/profile photo, platform self-assignment.
-- Enum values only — must commit before indexes/updates that use them (see 051).

ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'started';

ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'delivery.accepted';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'delivery.started';
ALTER TYPE "ParcelEventType" ADD VALUE IF NOT EXISTS 'delivery.claimed';

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP(3);

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS driver_instructions TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DriverVehicleType') THEN
    CREATE TYPE "DriverVehicleType" AS ENUM (
      'on_foot',
      'bicycle',
      'motorcycle',
      'car',
      'van'
    );
  END IF;
END $$;

ALTER TABLE driver_dossiers
  ADD COLUMN IF NOT EXISTS is_accepting_work BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_photo_ref TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_type "DriverVehicleType",
  ADD COLUMN IF NOT EXISTS vehicle_make_model TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT;

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS driver_self_assignment_enabled BOOLEAN NOT NULL DEFAULT FALSE;
