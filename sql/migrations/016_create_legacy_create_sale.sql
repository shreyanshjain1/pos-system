-- 016_create_legacy_create_sale.sql
-- Compatibility wrapper for legacy create_sale signature (6 args)
-- Drops any existing 6-arg overload and creates a wrapper that forwards
-- to the canonical create_sale(total, payment_method, items, user_id, shop_id).

DROP FUNCTION IF EXISTS public.create_sale(uuid, jsonb, text, uuid, numeric, uuid);

CREATE OR REPLACE FUNCTION public.create_sale(
  p_device_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_payment_method text DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL,
  p_total numeric DEFAULT 0,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Forward to canonical create_sale(total, payment_method, items, user_id, shop_id)
  RETURN public.create_sale(p_total, p_payment_method, p_items, p_user_id, p_shop_id);
END;
$$;
