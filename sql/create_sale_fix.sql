-- Replace the existing create_sale RPC with this fully-qualified, defensive implementation.
-- Run this in your Supabase SQL editor (or psql) to update the function.

-- Drop the existing function first (Postgres won't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.create_sale(numeric, text, jsonb, uuid, uuid);


CREATE OR REPLACE FUNCTION public.create_sale(
  p_total numeric,
  p_payment_method text,
  p_items jsonb,
  p_user_id uuid DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_price numeric;
BEGIN
  -- Basic validation
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;

  -- Create sale record (attach shop_id when provided)
  INSERT INTO public.sales (total, payment_method, created_at, user_id, shop_id)
  VALUES (p_total, p_payment_method, now(), p_user_id, p_shop_id)
  RETURNING id INTO v_sale_id;

  -- Create sale items and update product stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);

    -- Insert sale item with explicit column names, include shop_id for explicit tenant linkage
    INSERT INTO public.sale_items (sale_id, product_id, quantity, price, shop_id)
    VALUES (v_sale_id, v_product_id, v_qty, v_price, p_shop_id);

    -- Decrement product stock using fully-qualified references
    UPDATE public.products
    SET stock = public.products.stock - v_qty
    WHERE public.products.id = v_product_id;
  END LOOP;

  -- Return sale + items as JSON, include product names by joining products
  RETURN (
    SELECT jsonb_build_object(
      'sale', to_jsonb(s.*),
      'items', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'price', si.price
        ) ORDER BY si.id)
        FROM public.sale_items si
        LEFT JOIN public.products p ON p.id = si.product_id
        WHERE si.sale_id = s.id
      )
    )
    FROM public.sales s
    WHERE s.id = v_sale_id
  );
END;
$$;

-- Notes:
-- 1) This function uses fully-qualified table/column references to avoid ambiguous column errors.
-- 2) If you need stock validation (prevent negative stock), add checks before the UPDATE or raise.
-- 3) Ensure your RLS/policies allow the server key to execute this (use service_role for server RPCs).
