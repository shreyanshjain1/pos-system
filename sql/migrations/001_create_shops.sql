-- 001_create_shops.sql
-- Run this in Supabase SQL editor or via psql against your database.

-- 1) Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2) Link users to shops (many-to-many, with roles)
CREATE TABLE IF NOT EXISTS user_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

-- 3) Add shop_id FK to tenant tables (products, sales) if they exist
-- Make these ALTER statements idempotent by checking the column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='shop_id'
  ) THEN
    ALTER TABLE products ADD COLUMN shop_id uuid REFERENCES shops(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='shop_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN shop_id uuid REFERENCES shops(id);
  END IF;
END$$;

-- Ensure shop names are unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS shops_name_lower_idx ON shops (lower(name));

-- 4) Example Row-Level Security (RLS) policies
-- IMPORTANT: Review and adapt these policies for your auth model.
-- Enable RLS on tenant tables
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Products: restrict to shop members" ON products
--   USING (shop_id IS NULL OR EXISTS (SELECT 1 FROM user_shops us WHERE us.shop_id = products.shop_id AND us.user_id = auth.jwt()::json->>'sub'));

-- More robust approach: create a Postgres function that checks membership by auth.uid()

-- NOTES:
-- - You must map Supabase auth user (auth.uid()) to your users table or use the JWT `sub` claim.
-- - For a secure multi-tenant system, enable RLS and write policies that check membership via `user_shops`.
