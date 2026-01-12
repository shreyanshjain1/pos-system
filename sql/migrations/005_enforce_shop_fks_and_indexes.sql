-- 005_enforce_shop_fks_and_indexes.sql
-- Enforce shop_id foreign keys, add indexes, and make shop_id NOT NULL when safe.

-- WARNING: Review and run in a transaction in your Supabase SQL editor. This migration
-- attempts safe operations and will NOT force non-null if data exists with NULL shop_id.

DO $$
BEGIN
  -- Ensure products.shop_id exists and fk to shops(id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='shop_id') THEN
    ALTER TABLE products ADD COLUMN shop_id uuid REFERENCES shops(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_shop_id_fkey') THEN
    BEGIN
      ALTER TABLE products ADD CONSTRAINT products_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Ensure sales.shop_id exists and fk to shops(id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='shop_id') THEN
    ALTER TABLE sales ADD COLUMN shop_id uuid REFERENCES shops(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_shop_id_fkey') THEN
    BEGIN
      ALTER TABLE sales ADD CONSTRAINT sales_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Ensure sale_items.shop_id exists and fk to shops(id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='shop_id') THEN
    ALTER TABLE sale_items ADD COLUMN shop_id uuid REFERENCES shops(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_shop_id_fkey') THEN
    BEGIN
      ALTER TABLE sale_items ADD CONSTRAINT sale_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Create indexes for performance
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='products' AND indexname='idx_products_shop_id') THEN
    CREATE INDEX idx_products_shop_id ON products(shop_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='sales' AND indexname='idx_sales_shop_id') THEN
    CREATE INDEX idx_sales_shop_id ON sales(shop_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='sale_items' AND indexname='idx_sale_items_shop_id') THEN
    CREATE INDEX idx_sale_items_shop_id ON sale_items(shop_id);
  END IF;

  -- Attempt to set NOT NULL for shop_id if there are no NULLs (safe operation)
  IF (SELECT count(*) FROM products WHERE shop_id IS NULL) = 0 THEN
    EXECUTE 'ALTER TABLE products ALTER COLUMN shop_id SET NOT NULL';
  END IF;

  IF (SELECT count(*) FROM sales WHERE shop_id IS NULL) = 0 THEN
    EXECUTE 'ALTER TABLE sales ALTER COLUMN shop_id SET NOT NULL';
  END IF;

  IF (SELECT count(*) FROM sale_items WHERE shop_id IS NULL) = 0 THEN
    EXECUTE 'ALTER TABLE sale_items ALTER COLUMN shop_id SET NOT NULL';
  END IF;

  -- Enforce one-shop-per-user at DB level (unique index). This will fail if duplicates exist.
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='user_shops' AND indexname='uniq_user_shops_user_id') THEN
    BEGIN
      CREATE UNIQUE INDEX uniq_user_shops_user_id ON user_shops(user_id);
    EXCEPTION WHEN unique_violation THEN
      -- duplicates exist; do not create index automatically
      RAISE NOTICE 'Cannot create unique index uniq_user_shops_user_id: duplicates exist. Please resolve manually.';
    END;
  END IF;

END$$;

-- Notes:
-- 1) If any step fails due to existing data (e.g., duplicates preventing a unique index), resolve
--    the data manually in Supabase and re-run the relevant statements.
-- 2) Consider enabling Row-Level Security (RLS) and creating policies that restrict access
--    to rows where the current user's id is present in `user_shops` for the corresponding shop.
