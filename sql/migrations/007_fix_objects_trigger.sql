-- Migration 007: Fix misplaced storage.objects_update_cleanup trigger
-- 1) Backup the function source if present
-- 2) Drop any triggers that call the function on `public.products`
-- 3) Create the correct statement-level trigger on `storage.objects` with REFERENCING NEW TABLE / OLD TABLE

BEGIN;

-- Backup function definition (idempotent)
CREATE TABLE IF NOT EXISTS admin_function_backups (
  name text PRIMARY KEY,
  src text,
  saved_at timestamptz DEFAULT now()
);

INSERT INTO admin_function_backups(name, src)
SELECT 'objects_update_cleanup', pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname = 'objects_update_cleanup'
ON CONFLICT (name) DO NOTHING;

-- Drop any trigger on public.products that calls objects_update_cleanup
DO $$
DECLARE
  trg RECORD;
BEGIN
  FOR trg IN
    SELECT tg.tgname AS trigger_name
    FROM pg_trigger tg
    JOIN pg_class c ON tg.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_proc p ON tg.tgfoid = p.oid
    WHERE p.proname = 'objects_update_cleanup' AND n.nspname = 'public' AND c.relname = 'products'
  LOOP
    RAISE NOTICE 'Dropping trigger % on public.products', trg.trigger_name;
    -- Use DROP TRIGGER IF EXISTS ... ON <table> because ALTER TABLE ... DROP TRIGGER IF EXISTS is invalid
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.products', trg.trigger_name);
  END LOOP;
END;
$$;

-- Ensure correct trigger exists on storage.objects (FOR EACH STATEMENT with table references)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'objects_update_cleanup_trigger' AND n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER objects_update_cleanup_trigger
      AFTER UPDATE ON storage.objects
      REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
      FOR EACH STATEMENT
      EXECUTE FUNCTION storage.objects_update_cleanup();
    $sql$;
    RAISE NOTICE 'Created trigger storage.objects.objects_update_cleanup_trigger';
  ELSE
    RAISE NOTICE 'Trigger storage.objects.objects_update_cleanup_trigger already exists, skipping creation';
  END IF;
END;
$$;

COMMIT;

-- Notes:
-- Run this as a DB admin (postgres role or service_role). Always review backups in `admin_function_backups` before applying further changes.
-- If your storage schema or table names differ, adjust the statements accordingly.
