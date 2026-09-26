-- Uses DeliveryStatus values added in 050 (must be a separate committed migration).

-- Promote legacy actionable "assigned" rows past new accept/start gates.
UPDATE deliveries
SET status = 'started',
    accepted_at = COALESCE(accepted_at, created_at),
    started_at = COALESCE(started_at, created_at),
    updated_at = NOW()
WHERE status = 'assigned';

-- One active delivery per parcel (atomic self-claim protection).
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_one_active_per_parcel_idx
  ON deliveries (parcel_id)
  WHERE status IN ('assigned', 'accepted', 'started', 'scanned', 'drop_off_pending');
