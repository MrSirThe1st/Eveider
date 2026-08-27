-- Global locker network settings (singleton) + reusable layout templates (modèles).

CREATE TABLE IF NOT EXISTS locker_network_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_matching_mode TEXT NOT NULL DEFAULT 'exact_or_larger'
    CHECK (size_matching_mode IN ('exact', 'exact_or_larger')),
  assignment_strategy TEXT NOT NULL DEFAULT 'smallest_fit'
    CHECK (assignment_strategy IN ('smallest_fit', 'first_available', 'preferred_size')),
  pickup_hold_hours INTEGER NOT NULL DEFAULT 48
    CHECK (pickup_hold_hours >= 1 AND pickup_hold_hours <= 720),
  pickup_reminder_hours INTEGER NOT NULL DEFAULT 24
    CHECK (pickup_reminder_hours >= 0 AND pickup_reminder_hours <= 720),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT locker_network_settings_reminder_lte_hold
    CHECK (pickup_reminder_hours <= pickup_hold_hours)
);

INSERT INTO locker_network_settings (
  size_matching_mode,
  assignment_strategy,
  pickup_hold_hours,
  pickup_reminder_hours
)
SELECT 'exact_or_larger', 'smallest_fit', 48, 24
WHERE NOT EXISTS (SELECT 1 FROM locker_network_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS locker_layout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rows INTEGER NOT NULL CHECK (rows >= 1 AND rows <= 12),
  columns INTEGER NOT NULL CHECK (columns >= 1 AND columns <= 12),
  cells JSONB NOT NULL,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT locker_layout_templates_name_nonempty CHECK (length(trim(name)) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS locker_layout_templates_name_active_uidx
  ON locker_layout_templates (lower(trim(name)))
  WHERE archived_at IS NULL;

-- Starter modèles: Standard 3×3 and Standard 4×4 (all medium).
INSERT INTO locker_layout_templates (name, description, rows, columns, cells, is_starter)
SELECT
  'Standard 3×3',
  'Grille 3×3 — compartiments moyens',
  3,
  3,
  '[
    {"label":"A1","size":"medium"},{"label":"A2","size":"medium"},{"label":"A3","size":"medium"},
    {"label":"B1","size":"medium"},{"label":"B2","size":"medium"},{"label":"B3","size":"medium"},
    {"label":"C1","size":"medium"},{"label":"C2","size":"medium"},{"label":"C3","size":"medium"}
  ]'::jsonb,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM locker_layout_templates WHERE lower(trim(name)) = lower('Standard 3×3') AND archived_at IS NULL
);

INSERT INTO locker_layout_templates (name, description, rows, columns, cells, is_starter)
SELECT
  'Standard 4×4',
  'Grille 4×4 — compartiments moyens',
  4,
  4,
  '[
    {"label":"A1","size":"medium"},{"label":"A2","size":"medium"},{"label":"A3","size":"medium"},{"label":"A4","size":"medium"},
    {"label":"B1","size":"medium"},{"label":"B2","size":"medium"},{"label":"B3","size":"medium"},{"label":"B4","size":"medium"},
    {"label":"C1","size":"medium"},{"label":"C2","size":"medium"},{"label":"C3","size":"medium"},{"label":"C4","size":"medium"},
    {"label":"D1","size":"medium"},{"label":"D2","size":"medium"},{"label":"D3","size":"medium"},{"label":"D4","size":"medium"}
  ]'::jsonb,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM locker_layout_templates WHERE lower(trim(name)) = lower('Standard 4×4') AND archived_at IS NULL
);
