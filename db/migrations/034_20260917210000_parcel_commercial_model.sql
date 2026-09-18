-- Marker for parcels created under the Phase 4+ commercial model.
-- Existing rows default to legacy. New Flow 1/2 inserts set canonical.
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS commercial_model TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_commercial_model_check;

ALTER TABLE parcels
  ADD CONSTRAINT parcels_commercial_model_check
    CHECK (commercial_model IN ('legacy', 'canonical'));
