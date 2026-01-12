-- 002_add_product_images_and_stock.sql
-- Adds `images` (jsonb array), `min_stock` and `max_stock` to `products`.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  -- add images jsonb column (array of objects with { url, alt })
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images'
  ) THEN
    ALTER TABLE products
      ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- add min_stock integer (default 0)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock'
  ) THEN
    ALTER TABLE products
      ADD COLUMN min_stock integer DEFAULT 0;
  END IF;

  -- add max_stock integer (nullable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock'
  ) THEN
    ALTER TABLE products
      ADD COLUMN max_stock integer NULL;
  END IF;

  -- Optional: create an index on min_stock/max_stock if queries will filter by them
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_products_min_stock'
  ) THEN
    CREATE INDEX idx_products_min_stock ON products (min_stock);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_products_max_stock'
  ) THEN
    CREATE INDEX idx_products_max_stock ON products (max_stock);
  END IF;
END$$;

-- Notes:
-- - `images` is stored as a JSONB array. Example value:
--   [{"url":"/storage/v1/object/public/shop-images/..","alt":"Front view"}, {"url":"..."}]
-- - Prefer storing actual files in Supabase Storage and saving the public URL/path here.
-- - After running this migration, update server APIs and UI to accept and display `images`, `min_stock`, and `max_stock`.
