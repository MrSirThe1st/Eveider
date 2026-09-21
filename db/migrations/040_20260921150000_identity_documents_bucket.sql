-- Private bucket for identity documents (driver IDs, later business pieces).
-- Files are not public: the web app streams them through /api/documents after auth.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'storage.buckets missing — skip identity-documents bucket';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'identity-documents',
    'identity-documents',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
