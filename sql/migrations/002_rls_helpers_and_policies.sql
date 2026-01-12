-- 002_rls_helpers_and_policies.sql
-- Run this in Supabase SQL editor or via psql against your database.
-- Adds helper functions and example Row-Level Security (RLS) policies
-- Adjust and review carefully before enabling in production.

-- 1) Helper: return current authenticated user's uid as uuid
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()::uuid;
$$;

-- 2) Helper: check whether the current user is a member of a shop
CREATE OR REPLACE FUNCTION public.is_shop_member(p_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_shops us
    WHERE us.shop_id = p_shop_id
      AND us.user_id = public.current_user_id()
  );
$$;

-- 3) Example RLS policies
-- NOTE: Run these AFTER you have backfilled existing rows with shop_id values
-- and verified your `user_shops` mappings.

-- Products: allow SELECT/UPDATE/DELETE only for shop members (or rows without shop_id)
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_member_only ON public.products;
CREATE POLICY products_select_member_only ON public.products
  FOR SELECT
  USING (shop_id IS NULL OR public.is_shop_member(shop_id));

DROP POLICY IF EXISTS products_modify_member_only ON public.products;
DROP POLICY IF EXISTS products_modify_update_member_only ON public.products;
CREATE POLICY products_modify_update_member_only ON public.products
  FOR UPDATE
  USING (public.is_shop_member(shop_id))
  WITH CHECK (public.is_shop_member(shop_id));

DROP POLICY IF EXISTS products_modify_delete_member_only ON public.products;
CREATE POLICY products_modify_delete_member_only ON public.products
  FOR DELETE
  USING (public.is_shop_member(shop_id));

-- Sales: restrict to shop members
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_member_only ON public.sales;
CREATE POLICY sales_member_only ON public.sales
  FOR ALL
  USING (public.is_shop_member(shop_id))
  WITH CHECK (public.is_shop_member(shop_id));

-- Shops: allow members to SELECT; only owners may UPDATE (example)
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shops_select_member_only ON public.shops;
CREATE POLICY shops_select_member_only ON public.shops
  FOR SELECT
  USING (public.is_shop_member(id) OR owner_user_id = public.current_user_id());

DROP POLICY IF EXISTS shops_update_owner_only ON public.shops;
CREATE POLICY shops_update_owner_only ON public.shops
  FOR UPDATE
  USING (owner_user_id = public.current_user_id())
  WITH CHECK (owner_user_id = public.current_user_id());

-- user_shops: allow users to INSERT themselves; allow owners to manage mappings
ALTER TABLE IF EXISTS public.user_shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_shops_self_insert ON public.user_shops;
CREATE POLICY user_shops_self_insert ON public.user_shops
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

DROP POLICY IF EXISTS user_shops_owner_manage ON public.user_shops;
CREATE POLICY user_shops_owner_manage ON public.user_shops
  FOR ALL
  USING (
    user_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.user_shops us2
      WHERE us2.user_id = public.current_user_id()
        AND us2.shop_id = user_shops.shop_id
        AND us2.role = 'owner'
    )
  )
  WITH CHECK (
    user_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.user_shops us2
      WHERE us2.user_id = public.current_user_id()
        AND us2.shop_id = user_shops.shop_id
        AND us2.role = 'owner'
    )
  );

-- 4) Notes / Recommendations (do not run as SQL):
-- - Backfill existing product/sales rows with a valid shop_id before enabling these policies
-- - Test policies in a staging environment first; use a dedicated admin role (service_role)
--   or the Supabase Dashboard for administrative tasks that must bypass RLS.
-- - If you use a separate `users` table, ensure auth.uid() maps to that user id or adapt
--   the helper functions to read the JWT `sub` claim accordingly.
