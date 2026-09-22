-- Assignment is a platform rule (exact-or-larger + smallest fit), not an Admin setting.
ALTER TABLE locker_network_settings
  DROP COLUMN IF EXISTS size_matching_mode,
  DROP COLUMN IF EXISTS assignment_strategy;
