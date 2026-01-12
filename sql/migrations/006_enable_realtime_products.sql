-- 006_enable_realtime_products.sql
-- Ensure the products table is published for logical replication (realtime)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.products;
  ELSE
    -- add table to publication if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime'
        AND pr.prrelid = 'public.products'::regclass
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
  END IF;
END$$;

-- Verify in Supabase Console -> Realtime Inspector that events appear for products.

