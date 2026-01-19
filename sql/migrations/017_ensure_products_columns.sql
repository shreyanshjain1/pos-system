-- 017_ensure_products_columns.sql
-- Idempotent migration to ensure products table has expected columns and defaults
DO $$
BEGIN
  -- ensure id column exists and has gen_random_uuid default (do not change PK if exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='id'
  ) THEN
    ALTER TABLE products ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;

  -- ensure name exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='name'
  ) THEN
    ALTER TABLE products ADD COLUMN name text NULL;
  END IF;

  -- ensure price numeric with default 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price'
  ) THEN
    ALTER TABLE products ADD COLUMN price numeric DEFAULT 0;
  ELSE
    -- ensure default exists
    IF (SELECT column_default FROM information_schema.columns WHERE table_name='products' AND column_name='price') IS NULL THEN
      EXECUTE 'ALTER TABLE products ALTER COLUMN price SET DEFAULT 0';
    END IF;
  END IF;

  -- ensure stock int with default 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock integer DEFAULT 0;
  ELSE
    IF (SELECT column_default FROM information_schema.columns WHERE table_name='products' AND column_name='stock') IS NULL THEN
      EXECUTE 'ALTER TABLE products ALTER COLUMN stock SET DEFAULT 0';
    END IF;
  END IF;

  -- ensure created_at timestamptz default now()
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_at'
  ) THEN
    ALTER TABLE products ADD COLUMN created_at timestamptz DEFAULT now();
  ELSE
    IF (SELECT column_default FROM information_schema.columns WHERE table_name='products' AND column_name='created_at') IS NULL THEN
      EXECUTE 'ALTER TABLE products ALTER COLUMN created_at SET DEFAULT now()';
    END IF;
  END IF;

  -- ensure shop_id exists and references shops(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='shop_id'
  ) THEN
    ALTER TABLE products ADD COLUMN shop_id uuid NULL REFERENCES shops(id);
  END IF;

  -- optional columns: barcode, images, min_stock, max_stock, sku
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images'
  ) THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN min_stock integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN max_stock integer NULL;
  END IF;

  -- ensure cost numeric (how much product was bought) with default 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost'
  ) THEN
    ALTER TABLE products ADD COLUMN cost numeric DEFAULT 0;
  ELSE
    IF (SELECT column_default FROM information_schema.columns WHERE table_name='products' AND column_name='cost') IS NULL THEN
      EXECUTE 'ALTER TABLE products ALTER COLUMN cost SET DEFAULT 0';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text NULL;
  END IF;

  -- create a unique index for barcode per shop to prevent duplicate barcodes within the same shop
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_products_shop_barcode_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_products_shop_barcode_unique ON products (shop_id, barcode) WHERE barcode IS NOT NULL';
  END IF;
END$$;

-- Notes: Run this migration in Supabase SQL editor or via psql. It is safe to run multiple times.
